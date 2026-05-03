import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SqlGenerationProvider, SqlGenerationProviderRequest, SqlGenerationProviderResult } from "./sql-generation-provider.interface";

@Injectable()
export class GroqSqlGenerationProvider implements SqlGenerationProvider {
  readonly id = "groq" as const;

  private readonly logger = new Logger(GroqSqlGenerationProvider.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>("GROQ_API_KEY")?.trim());
  }

  async complete(request: SqlGenerationProviderRequest): Promise<SqlGenerationProviderResult> {
    const apiKey = this.config.get<string>("GROQ_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }
    const model = this.config.get<string>("GROQ_MODEL")?.trim() || "llama-3.3-70b-versatile";

    const started = Date.now();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), request.timeoutMs);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          max_tokens: 2048,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
        }),
        signal: ac.signal,
      });

      const durationMs = Date.now() - started;
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        this.logger.warn(`Groq HTTP ${res.status}: ${errText.slice(0, 500)}`);
        throw new Error(`Groq request failed (${res.status})`);
      }
      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      if (body.error?.message) {
        throw new Error(body.error.message);
      }
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("Groq returned an empty response");
      }
      return { rawText: text, durationMs };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error(`Groq timed out after ${request.timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}
