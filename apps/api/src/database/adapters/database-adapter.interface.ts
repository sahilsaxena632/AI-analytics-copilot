import type { Logger } from "@nestjs/common";

/** Normalized column row for cached schema JSON (shared across dialects). */
export interface SchemaColumnRow {
  tableSchema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  /** Present when the source catalog exposes primary-key membership. */
  isPrimaryKey?: boolean;
}

export type AdapterExecuteResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
};

/** Sample rows for a single table UI; TODO: real preview + identifier quoting per dialect. */
export type TablePreviewResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
};

export type AdapterTestResult = { ok: true } | { ok: false; message: string };

/** Until executeQuery accepts options, adapters apply this row cap internally. */
export const DEFAULT_ADAPTER_QUERY_ROW_CAP = 500;

/**
 * External database access. Add SQL Server / Snowflake / BigQuery by implementing new adapters
 * and registering them in `DatabaseAdapterFactory`.
 *
 * Extension points:
 * - `getSchema()` — full catalog introspection (refine per engine).
 * - `getTablePreview()` — bounded sample for one table (add identifier validation + LIMIT policy).
 * - `executeQuery()` — read-only analytics path (add streaming, timeouts, semantic layer, etc.).
 */
export interface DatabaseAdapter {
  readonly dialect: "postgres" | "mysql";

  /** Connectivity check only — runs a trivial built-in statement (no user SQL). */
  testConnection(logger: Logger, contextLabel: string): Promise<AdapterTestResult>;

  /** Catalog column metadata for schema explorer / cache. */
  getSchema(): Promise<SchemaColumnRow[]>;

  /**
   * Preview rows for a named table. Stub: returns empty result until identifier rules + LIMIT are implemented.
   * TODO: validate `tableName`, quote per dialect (`"schema"."table"` vs backticks), run `SELECT * … LIMIT n`.
   */
  getTablePreview(tableName: string): Promise<TablePreviewResult>;

  /**
   * Run a single read-only SQL statement (caller normalizes trailing semicolons if needed).
   * TODO: optional options bag (maxRows, timeoutMs, session vars); dialect-specific wrapping.
   */
  executeQuery(sql: string): Promise<AdapterExecuteResult>;
}
