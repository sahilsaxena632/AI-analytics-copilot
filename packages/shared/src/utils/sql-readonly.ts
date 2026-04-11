const BLOCKED =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CALL|EXECUTE|MERGE|REPLACE|COPY|VACUUM|PREPARE)\b/i;

/**
 * MVP guard: allow only SELECT / WITH queries, single statement, no obvious DDL/DML keywords.
 * TODO: Replace with a proper SQL parser for production (e.g. pg-query-parser) to block edge cases.
 */
export function assertReadOnlySql(sql: string): void {
  const trimmed = sql.trim();
  if (!trimmed) {
    throw new Error("SQL must not be empty");
  }
  if (trimmed.includes(";") && trimmed.replace(/;+\s*$/g, "").includes(";")) {
    throw new Error("Only a single SQL statement is allowed");
  }
  const withoutTrailingSemicolon = trimmed.replace(/;+\s*$/g, "").trim();
  const upper = withoutTrailingSemicolon.toUpperCase();
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    throw new Error("Only SELECT or WITH queries are allowed");
  }
  if (BLOCKED.test(withoutTrailingSemicolon)) {
    throw new Error("Query contains disallowed keywords for read-only execution");
  }
}
