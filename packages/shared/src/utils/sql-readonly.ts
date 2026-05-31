import { Parser } from "node-sql-parser";

export type SqlDialect = "postgres" | "mysql";

export type ReadOnlySqlValidationResult =
  | { ok: true; normalizedSql: string }
  | { ok: false; error: string };

type AstNode = Record<string, unknown>;

const parser = new Parser();

function mapDialect(dialect: SqlDialect): "postgresql" | "mysql" {
  return dialect === "mysql" ? "mysql" : "postgresql";
}

function parseStatements(sql: string, dialect: SqlDialect): AstNode[] | ReadOnlySqlValidationResult {
  try {
    const ast = parser.astify(sql, { database: mapDialect(dialect) });
    const nodes = (Array.isArray(ast) ? ast : [ast]) as unknown as AstNode[];
    return nodes;
  } catch {
    return { ok: false, error: "SQL could not be parsed. Only read-only SELECT queries are allowed." };
  }
}

function isSelectStatement(node: AstNode): boolean {
  return node.type === "select";
}

function collectForbiddenReason(node: unknown, depth = 0): string | null {
  if (node == null || depth > 64) {
    return null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = collectForbiddenReason(item, depth + 1);
      if (hit) {
        return hit;
      }
    }
    return null;
  }
  if (typeof node !== "object") {
    return null;
  }

  const record = node as AstNode;
  const type = typeof record.type === "string" ? record.type.toLowerCase() : "";

  if (
    type &&
    type !== "select" &&
    type !== "column_ref" &&
    type !== "star" &&
    type !== "expr" &&
    type !== "aggr_func" &&
    type !== "function" &&
    type !== "binary_expr" &&
    type !== "unary_expr" &&
    type !== "case" &&
    type !== "cast" &&
    type !== "window_func" &&
    type !== "over" &&
    type !== "when" &&
    type !== "else" &&
    type !== "interval" &&
    type !== "number" &&
    type !== "string" &&
    type !== "bool" &&
    type !== "null" &&
    type !== "single_quote_string" &&
    type !== "double_quote_string" &&
    type !== "backticks_quote_string" &&
    type !== "var" &&
    type !== "origin" &&
    type !== "join" &&
    type !== "table_ref" &&
    type !== "subquery" &&
    type !== "derived_table" &&
    type !== "with" &&
    type !== "cte" &&
    type !== "limit" &&
    type !== "order_by" &&
    type !== "group_by" &&
    type !== "having" &&
    type !== "where" &&
    type !== "from" &&
    type !== "column" &&
    type !== "value" &&
    type !== "as" &&
    type !== "using" &&
    type !== "on" &&
    type !== "and" &&
    type !== "or" &&
    type !== "not" &&
    type !== "exists" &&
    type !== "in" &&
    type !== "between" &&
    type !== "is" &&
    type !== "like" &&
    type !== "ilike" &&
    type !== "collate" &&
    type !== "at" &&
    type !== "any" &&
    type !== "all" &&
    type !== "some" &&
    type !== "array" &&
    type !== "json" &&
    type !== "default" &&
    type !== "param" &&
    type !== "placeholder"
  ) {
    const blocked = new Set([
      "insert",
      "update",
      "delete",
      "drop",
      "alter",
      "create",
      "truncate",
      "grant",
      "revoke",
      "call",
      "execute",
      "merge",
      "replace",
      "copy",
      "vacuum",
      "prepare",
      "lock",
      "unlock",
      "set",
      "show",
      "use",
      "describe",
      "explain",
      "analyze",
      "load",
      "handler",
      "do",
      "declare",
      "begin",
      "commit",
      "rollback",
    ]);
    if (blocked.has(type)) {
      return "This statement includes commands that are not allowed for read-only analytics.";
    }
  }

  if (record.into != null) {
    return "SELECT INTO and file export statements are not allowed.";
  }
  if (record.for_update != null || record.forUpdate != null) {
    return "Row-locking clauses are not allowed for read-only analytics.";
  }
  if (record.lock_in_share_mode != null || record.lockInShareMode != null) {
    return "Row-locking clauses are not allowed for read-only analytics.";
  }
  if (record.procedure != null || record.procedural != null) {
    return "Procedural SQL is not allowed for read-only analytics.";
  }

  for (const value of Object.values(record)) {
    const hit = collectForbiddenReason(value, depth + 1);
    if (hit) {
      return hit;
    }
  }
  return null;
}

function extractLimitValue(limit: unknown): number | null {
  if (!limit || typeof limit !== "object") {
    return null;
  }
  const record = limit as AstNode;
  const value = record.value;
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const first = value[0] as AstNode;
  if (first?.type === "number" && typeof first.value === "number") {
    return first.value;
  }
  return null;
}

function normalizeStatement(stmt: AstNode, dialect: SqlDialect): string {
  try {
    return parser.sqlify(stmt as unknown as Parameters<Parser["sqlify"]>[0], {
      database: mapDialect(dialect),
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Validates that SQL is a single read-only SELECT / WITH query using a dialect-aware parser.
 */
export function tryValidateReadOnlySql(
  sql: string,
  dialect: SqlDialect = "postgres",
): ReadOnlySqlValidationResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, error: "Add a SQL query before running." };
  }

  const parsed = parseStatements(trimmed, dialect);
  if (!Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed.length !== 1) {
    return { ok: false, error: "Only a single SQL statement is allowed" };
  }

  const stmt = parsed[0];
  if (!isSelectStatement(stmt)) {
    return { ok: false, error: "Only SELECT or WITH queries are allowed" };
  }

  const forbidden = collectForbiddenReason(stmt);
  if (forbidden) {
    return { ok: false, error: forbidden };
  }

  const normalizedSql = normalizeStatement(stmt, dialect);
  if (!normalizedSql) {
    return { ok: false, error: "SQL could not be normalized for execution." };
  }

  return { ok: true, normalizedSql };
}

/**
 * Validates read-only SQL and returns canonical SQL with a server-enforced row cap.
 * Avoids subquery wrapping so comment-based LIMIT bypasses cannot occur.
 */
export function prepareReadOnlyQuery(
  sql: string,
  dialect: SqlDialect,
  maxRows: number,
): ReadOnlySqlValidationResult {
  const validated = tryValidateReadOnlySql(sql, dialect);
  if (!validated.ok) {
    return validated;
  }

  const parsed = parseStatements(validated.normalizedSql, dialect);
  if (!Array.isArray(parsed)) {
    return parsed;
  }

  const stmt = parsed[0];
  const cap = maxRows + 1;
  const existing = stmt.limit ? extractLimitValue(stmt.limit) : null;
  if (existing == null || existing > cap) {
    stmt.limit = {
      seperator: "",
      value: [{ type: "number", value: cap }],
    };
  }

  const normalizedSql = normalizeStatement(stmt, dialect);
  if (!normalizedSql) {
    return { ok: false, error: "SQL could not be prepared for execution." };
  }

  return { ok: true, normalizedSql };
}

export function assertReadOnlySql(sql: string, dialect: SqlDialect = "postgres"): void {
  const r = tryValidateReadOnlySql(sql, dialect);
  if (!r.ok) {
    throw new Error(r.error);
  }
}
