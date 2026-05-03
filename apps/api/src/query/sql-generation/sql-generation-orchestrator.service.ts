import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GenerateSqlResponseDto, SqlGenerationConfidence } from "@analytics-copilot/shared";
import { tryValidateReadOnlySql } from "@analytics-copilot/shared";
import type { TableModel } from "./sql-generation-context.util";
import { limitTablesForPrompt } from "./sql-generation-context.util";
import {
  buildSqlGenerationSystemPrompt,
  buildSqlGenerationUserPrompt,
  type SqlPromptDialect,
  type SqlPromptPayload,
} from "./sql-prompt-builder";
import { parseLlmSqlJson } from "./sql-llm-json.parser";
import { GeminiSqlGenerationProvider } from "./gemini-sql-generation.provider";
import { GroqSqlGenerationProvider } from "./groq-sql-generation.provider";
import type { SqlGenerationProvider, SqlGenerationProviderId } from "./sql-generation-provider.interface";

function scoreToBand(score: number): SqlGenerationConfidence {
  if (score < 0.45) {
    return "low";
  }
  if (score < 0.72) {
    return "medium";
  }
  return "high";
}

function parseProviderList(raw: string | undefined, fallback: SqlGenerationProviderId[]): SqlGenerationProviderId[] {
  const parts = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const out: SqlGenerationProviderId[] = [];
  for (const p of parts) {
    if (p === "gemini" || p === "groq") {
      out.push(p);
    }
  }
  return out.length ? out : fallback;
}

function uniqueProviders(ids: SqlGenerationProviderId[], gemini: GeminiSqlGenerationProvider, groq: GroqSqlGenerationProvider) {
  const map: Record<SqlGenerationProviderId, SqlGenerationProvider> = {
    gemini,
    groq,
  };
  const seen = new Set<SqlGenerationProviderId>();
  const list: SqlGenerationProvider[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      continue;
    }
    const p = map[id];
    if (p.isConfigured()) {
      seen.add(id);
      list.push(p);
    }
  }
  return list;
}

@Injectable()
export class SqlGenerationOrchestratorService {
  private readonly logger = new Logger(SqlGenerationOrchestratorService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly gemini: GeminiSqlGenerationProvider,
    private readonly groq: GroqSqlGenerationProvider,
  ) {}

  async generateWithLlm(input: {
    databaseConnectionId: string;
    dialect: SqlPromptDialect;
    question: string;
    schemaContext?: string;
    workingTables: TableModel[];
    suggestedTables: string[];
    /** True when the user explicitly selected tables (narrow context). */
    userNarrowedTables: boolean;
  }): Promise<GenerateSqlResponseDto> {
    const primaryOrder = parseProviderList(this.config.get<string>("SQL_GEN_PRIMARY_PROVIDER"), ["gemini"]);
    const fallbackOrder = parseProviderList(this.config.get<string>("SQL_GEN_FALLBACK_PROVIDER"), ["groq"]);
    const orderedIds: SqlGenerationProviderId[] = [...primaryOrder, ...fallbackOrder];
    const providers = uniqueProviders(orderedIds, this.gemini, this.groq);

    const timeoutMs = Math.max(
      5000,
      Math.min(120_000, Number(this.config.get<string>("SQL_GEN_TIMEOUT_MS")) || 55_000),
    );
    const minConfidence = Math.min(
      1,
      Math.max(0, Number(this.config.get<string>("SQL_GEN_MIN_CONFIDENCE_SCORE")) || 0.45),
    );

    const maxTables = Math.max(5, Math.min(80, Number(this.config.get<string>("SQL_GEN_PROMPT_MAX_TABLES")) || 36));
    const maxCols = Math.max(8, Math.min(120, Number(this.config.get<string>("SQL_GEN_PROMPT_MAX_COLS_PER_TABLE")) || 48));
    const { tables: promptTables, truncated } = limitTablesForPrompt(input.workingTables, maxTables, maxCols);

    const systemPrompt = buildSqlGenerationSystemPrompt(input.dialect);
    const baseUserPayload: SqlPromptPayload = {
      question: input.question,
      schemaContext: input.schemaContext,
      dialect: input.dialect,
      tables: promptTables,
      schemaTruncated: truncated,
    };

    if (providers.length === 0) {
      this.logger.warn("No LLM providers configured (missing GEMINI_API_KEY and GROQ_API_KEY).");
      return {
        status: "needs_clarification",
        generatedSql: null,
        explanation:
          "SQL generation is not configured on the server. Add GEMINI_API_KEY and/or GROQ_API_KEY, then set SQL_GEN_PRIMARY_PROVIDER / SQL_GEN_FALLBACK_PROVIDER.",
        needsClarification: true,
        clarificationQuestion: "Can your administrator enable Gemini or Groq API keys for this workspace?",
        providerUsed: "none",
        suggestedTables: input.suggestedTables,
      };
    }

    this.logger.log(
      `SQL gen: connection=${input.databaseConnectionId} dialect=${input.dialect} providers=${providers.map((p) => p.id).join(">")} timeoutMs=${timeoutMs} narrowed=${input.userNarrowedTables} question=${input.question.slice(0, 280).replace(/\s+/g, " ")}`,
    );

    const attemptLog: string[] = [];
    let lastParseFailure: string | null = null;
    let lastHttpFailure: string | null = null;
    let validationFailure: string | null = null;

    const runProvider = async (
      provider: SqlGenerationProvider,
      validationHint?: string,
    ): Promise<{ parsed: NonNullable<ReturnType<typeof parseLlmSqlJson>>; durationMs: number } | null> => {
      const userPrompt = buildSqlGenerationUserPrompt({
        ...baseUserPayload,
        validationRetryHint: validationHint,
      });
      try {
        const { rawText, durationMs } = await provider.complete({
          systemPrompt,
          userPrompt,
          timeoutMs,
        });
        const parsed = parseLlmSqlJson(rawText, this.logger);
        if (!parsed) {
          lastParseFailure = "Model output was not valid JSON.";
          attemptLog.push(`${provider.id}:parse_fail:${durationMs}ms`);
          return null;
        }
        attemptLog.push(`${provider.id}:ok:${durationMs}ms`);
        return { parsed, durationMs };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        lastHttpFailure = msg;
        attemptLog.push(`${provider.id}:error:${msg.slice(0, 80)}`);
        this.logger.warn(`Provider ${provider.id} failed: ${msg}`);
        return null;
      }
    };

    const buildClarification = (
      explanation: string,
      clarificationQuestion: string | null,
      providerUsed: string,
      extra?: Partial<GenerateSqlResponseDto>,
    ): GenerateSqlResponseDto => ({
      status: "needs_clarification",
      generatedSql: null,
      explanation,
      needsClarification: true,
      clarificationQuestion: clarificationQuestion ?? null,
      providerUsed,
      suggestedTables: input.suggestedTables,
      ...extra,
    });

    const interpretParsed = (
      parsed: NonNullable<ReturnType<typeof parseLlmSqlJson>>,
      providerId: string,
    ): GenerateSqlResponseDto | null => {
      if (parsed.needs_clarification || !parsed.sql) {
        return buildClarification(
          parsed.explanation || "More detail is needed before we can write SQL.",
          parsed.clarification_question,
          providerId,
          { confidenceScore: parsed.confidence, confidence: scoreToBand(parsed.confidence), usedTables: parsed.used_tables },
        );
      }
      if (parsed.confidence < minConfidence) {
        return buildClarification(
          parsed.explanation ||
            "The model is not confident enough to return SQL without risking a wrong answer. Try rephrasing or narrowing tables.",
          parsed.clarification_question ??
            "What metric, time range, or grain should the result use (for example daily totals by region)?",
          providerId,
          { confidenceScore: parsed.confidence, confidence: scoreToBand(parsed.confidence), usedTables: parsed.used_tables },
        );
      }
      const validation = tryValidateReadOnlySql(parsed.sql);
      if (!validation.ok) {
        validationFailure = validation.error;
        return null;
      }
      return {
        status: "ok",
        generatedSql: validation.normalizedSql,
        explanation: parsed.explanation || "Generated read-only SELECT for your question.",
        confidence: scoreToBand(parsed.confidence),
        confidenceScore: parsed.confidence,
        needsClarification: false,
        clarificationQuestion: null,
        usedTables: parsed.used_tables.length ? parsed.used_tables : undefined,
        providerUsed: providerId,
      };
    };

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i]!;
      const out = await runProvider(provider);
      if (!out) {
        continue;
      }
      const { parsed } = out;
      const interpreted = interpretParsed(parsed, provider.id);
      if (interpreted) {
        this.logger.log(
          `SQL gen result: provider=${interpreted.providerUsed ?? provider.id} status=${interpreted.status} confidence=${parsed.confidence} attempts=${attemptLog.join(";")}`,
        );
        return interpreted;
      }

      if (validationFailure && i + 1 < providers.length) {
        const next = providers[i + 1]!;
        const hint = `Validation error: ${validationFailure}. Output a single compliant SELECT (or WITH … SELECT) only, as JSON.`;
        const second = await runProvider(next, hint);
        if (second) {
          const interpreted2 = interpretParsed(second.parsed, next.id);
          if (interpreted2) {
            this.logger.log(
              `SQL gen result (after validation retry): provider=${interpreted2.providerUsed} status=${interpreted2.status} attempts=${attemptLog.join(";")}`,
            );
            return interpreted2;
          }
        }
        this.logger.warn(`SQL gen validation failed after fallback: ${validationFailure}`);
        return buildClarification(
          "Generated SQL did not pass read-only safety checks after trying an alternate model.",
          "Can you simplify the question, name the exact columns to use, or narrow to one fact table?",
          next.id,
          {
            validationError: validationFailure,
            confidenceScore: second?.parsed.confidence,
            confidence: second ? scoreToBand(second.parsed.confidence) : undefined,
          },
        );
      }
    }

    if (validationFailure) {
      return buildClarification(
        "Generated SQL did not pass read-only safety checks.",
        "Try a simpler question or name the columns explicitly.",
        providers[providers.length - 1]!.id,
        { validationError: validationFailure },
      );
    }

    return buildClarification(
      [
        "We could not produce SQL from the language model right now.",
        lastParseFailure ? lastParseFailure : null,
        lastHttpFailure ? `Last error: ${lastHttpFailure}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      "Try again in a moment, narrow table context, or rephrase the question.",
      "none",
      { providerUsed: "none" },
    );
  }
}
