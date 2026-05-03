import { Logger } from "@nestjs/common";

export type ParsedLlmSqlJson = {
  sql: string | null;
  explanation: string;
  confidence: number;
  needs_clarification: boolean;
  clarification_question: string | null;
  used_tables: string[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickString(v: unknown): string | null {
  if (typeof v === "string") {
    return v;
  }
  return null;
}

function pickBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") {
    return v;
  }
  return undefined;
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

function pickStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

/** Strip ```json fences if the model wrapped JSON. */
export function extractJsonObjectText(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence?.[1]) {
    return fence[1].trim();
  }
  return t;
}

export function parseLlmSqlJson(raw: string, logger?: Logger): ParsedLlmSqlJson | null {
  const text = extractJsonObjectText(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(text) as unknown;
  } catch (e) {
    logger?.warn(`LLM SQL JSON parse failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
  const rec = asRecord(obj);
  if (!rec) {
    return null;
  }

  const get = (snake: string, camel: string): unknown => rec[snake] ?? rec[camel];

  const sqlRaw = pickString(get("sql", "sql"));
  const explanation = pickString(get("explanation", "explanation"))?.trim() ?? "";
  const confRaw = pickNumber(get("confidence", "confidence"));
  const confidence = confRaw === undefined ? 0 : Math.min(1, Math.max(0, confRaw));
  const needs =
    pickBool(get("needs_clarification", "needsClarification")) ??
    (pickString(get("needs_clarification", "needsClarification")) === "true");
  const clar =
    pickString(get("clarification_question", "clarificationQuestion"))?.trim() ?? null;
  const used = pickStringArray(get("used_tables", "usedTables"));

  const sql = sqlRaw && sqlRaw.trim().length > 0 ? sqlRaw.trim() : null;

  return {
    sql,
    explanation,
    confidence,
    needs_clarification: Boolean(needs),
    clarification_question: clar && clar.length > 0 ? clar : null,
    used_tables: used,
  };
}
