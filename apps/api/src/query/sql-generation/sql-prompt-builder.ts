import type { TableModel } from "./sql-generation-context.util";

export type SqlPromptDialect = "postgres" | "mysql";

export type SqlPromptPayload = {
  question: string;
  schemaContext?: string;
  dialect: SqlPromptDialect;
  /** Tables included in the prompt (possibly truncated). */
  tables: TableModel[];
  schemaTruncated: boolean;
  /** Hint appended when retrying after validation failure. */
  validationRetryHint?: string;
};

const JSON_CONTRACT = `You must respond with a single JSON object only (no markdown), with exactly these keys:
- "sql": string or null — a single read-only SELECT (or WITH … SELECT) statement, or null if you cannot answer safely.
- "explanation": string — short, manager-friendly reason for the query or why you need clarification.
- "confidence": number from 0 to 1 — your confidence that the SQL is correct for the question and schema.
- "needs_clarification": boolean — true if the question is ambiguous, required tables/columns are missing, or you would be guessing.
- "clarification_question": string or null — if needs_clarification is true, one concrete question for the user; otherwise null.
- "used_tables": string[] — list of "schema.table" names you relied on (subset of the provided schema only; never invent names).

Rules:
- Never invent table or column names; only use identifiers present in the schema JSON.
- Prefer simple, readable SQL: explicit column lists when reasonable, LIMIT on large scans, clear aliases.
- One statement only; no semicolons inside string literals that could be parsed as multiple statements (avoid multiple statements entirely).
- If unsure or confidence would be below 0.55, set needs_clarification true, sql null, and ask a specific clarification_question instead of guessing.
`;

function dialectNotes(dialect: SqlPromptDialect): string {
  if (dialect === "postgres") {
    return `Database: PostgreSQL.
- Use double-quoted identifiers only when necessary; prefer lowercase unquoted identifiers when they are safe.
- Date bucketing may use DATE_TRUNC('month', ts_column) or similar when appropriate.
- Use standard PostgreSQL syntax.`;
  }
  return `Database: MySQL.
- Use backticks for reserved identifiers when needed.
- Date bucketing may use DATE_FORMAT(date_col, '%Y-%m-01') or similar when appropriate.
- Use MySQL-compatible syntax.`;
}

export function buildSqlGenerationSystemPrompt(dialect: SqlPromptDialect): string {
  return [`You are a careful analytics SQL assistant for a read-only BI tool.`, dialectNotes(dialect), JSON_CONTRACT].join(
    "\n\n",
  );
}

export function buildSqlGenerationUserPrompt(payload: SqlPromptPayload): string {
  const { question, schemaContext, dialect, tables, schemaTruncated, validationRetryHint } = payload;
  const schemaJson = {
    dialect,
    tables: tables.map((t) => ({
      schema: t.tableSchema,
      name: t.tableName,
      qualified: `${t.tableSchema}.${t.tableName}`,
      columns: t.columns.map((c) => ({
        name: c.name,
        dataType: c.dataType,
        nullable: c.isNullable,
        primaryKey: c.isPrimaryKey,
      })),
    })),
    note: schemaTruncated
      ? "Schema list was truncated for size; prefer tables the user selected or named in the question."
      : undefined,
  };

  const parts = [
    `User question:\n${question.trim()}`,
    schemaContext?.trim() ? `Additional hints from the user:\n${schemaContext.trim()}` : null,
    `Relevant schema (JSON):\n${JSON.stringify(schemaJson, null, 2)}`,
    validationRetryHint
      ? `Important: a previous answer failed read-only validation. Fix and return valid JSON.\n${validationRetryHint}`
      : null,
  ].filter(Boolean);

  return parts.join("\n\n");
}
