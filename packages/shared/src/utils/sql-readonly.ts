const BLOCKED =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CALL|EXECUTE|MERGE|REPLACE|COPY|VACUUM|PREPARE)\b/i;

export type ReadOnlySqlValidationResult =
  | { ok: true; normalizedSql: string }
  | { ok: false; error: string };

/**
 * Non-throwing variant for LLM SQL review and generation pipelines.
 * Trailing semicolons are stripped in `normalizedSql` when valid.
 */
export function tryValidateReadOnlySql(sql: string): ReadOnlySqlValidationResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, error: "Add a SQL query before running." };
  }
  if (trimmed.includes(";") && trimmed.replace(/;+\s*$/g, "").includes(";")) {
    return { ok: false, error: "Only a single SQL statement is allowed" };
  }
  const withoutTrailingSemicolon = trimmed.replace(/;+\s*$/g, "").trim();
  const upper = withoutTrailingSemicolon.toUpperCase();
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { ok: false, error: "Only SELECT or WITH queries are allowed" };
  }
  if (BLOCKED.test(withoutTrailingSemicolon)) {
    return { ok: false, error: "This statement includes commands that are not allowed for read-only analytics." };
  }
  return { ok: true, normalizedSql: withoutTrailingSemicolon };
}

/**
 * MVP guard: allow only SELECT / WITH queries, single statement, no obvious DDL/DML keywords.
 * TODO: Replace with a proper SQL parser for production (e.g. pg-query-parser) to block edge cases.
 */
export function assertReadOnlySql(sql: string): void {
  const r = tryValidateReadOnlySql(sql);
  if (!r.ok) {
    throw new Error(r.error);
  }
}
