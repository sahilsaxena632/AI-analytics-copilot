/** Column metadata from information_schema (subset). */
export interface SchemaColumnDto {
  tableSchema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey?: boolean;
}

/** Single column in the live schema explorer (per table). */
export interface SchemaExplorerColumnDto {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
}

export interface SchemaExplorerTableDto {
  tableSchema: string;
  tableName: string;
  columns: SchemaExplorerColumnDto[];
}

export interface SchemaExplorerSchemaDto {
  connectionId: string;
  dialect: "postgres" | "mysql";
  tables: SchemaExplorerTableDto[];
}

export interface SchemaTablePreviewDto {
  connectionId: string;
  dialect: "postgres" | "mysql";
  tableSchema: string | null;
  tableName: string;
  qualifiedName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

export interface SchemaSnapshotDto {
  connectionId: string;
  fetchedAt: string;
  columns: SchemaColumnDto[];
}

export interface AskQuestionResponseDto {
  /** Placeholder until LLM integration — deterministic template from question text. */
  generatedSql: string;
  explanation: string;
}

export type GenerateSqlStatus = "ok" | "needs_clarification";

export type SqlGenerationConfidence = "low" | "medium" | "high";

/** Request body for POST /queries/generate-sql. */
export interface GenerateSqlRequestDto {
  databaseConnectionId: string;
  question: string;
  /** Qualified names (`schema.table`). When empty or omitted, the full live schema is used. */
  selectedTables?: string[];
  /** @deprecated Prefer `selectedTables` with one entry. */
  selectedTable?: string;
  schemaContext?: string;
}

/** Response from POST /queries/generate-sql (LLM-ready contract). */
export interface GenerateSqlResponseDto {
  status: GenerateSqlStatus;
  generatedSql: string | null;
  explanation: string;
  confidence?: SqlGenerationConfidence;
  /** Model-reported confidence in [0, 1] when provided by the LLM path. */
  confidenceScore?: number;
  /** When the model or server asks the user for more specificity (mirrors `status === "needs_clarification"`). */
  needsClarification?: boolean;
  /** Short follow-up question for the user when clarification is required. */
  clarificationQuestion?: string | null;
  /** Qualified tables the model claims to have used (`schema.table`). */
  usedTables?: string[];
  /** Which LLM provider produced the successful parse (`gemini`, `groq`, or `none` if not applicable). */
  providerUsed?: string;
  /** When `generatedSql` was rejected by validation (unsafe or invalid shape). */
  validationError?: string | null;
  /** When status is needs_clarification — table names the user can pick. */
  suggestedTables?: string[];
}

export interface QueryExecuteResultDto {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  /** Wall-clock time for the database round-trip (ms). */
  durationMs?: number;
  /** Non-fatal notices (e.g. row cap applied). */
  warnings?: string[];
}

export interface SavedQueryDto {
  id: string;
  title: string;
  sqlText: string;
  /** Assistant-generated SQL before edits, when captured. */
  generatedSqlText?: string | null;
  naturalLanguageQuestion?: string | null;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
}

/** Enriched row from GET /query-runs (and legacy GET /query/runs). */
export interface QueryRunHistoryDto {
  id: string;
  connectionId: string;
  connectionName: string;
  databaseType: "postgres" | "mysql";
  sqlText: string;
  naturalLanguageQuestion: string | null;
  savedQueryId: string | null;
  savedQueryTitle: string | null;
  savedQueryQuestion: string | null;
  rowCount: number | null;
  success: boolean;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface DashboardCardDto {
  id: string;
  dashboardId: string;
  title: string;
  chartType: "bar" | "line" | "table";
  sqlText: string;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  /** Grid column (0-based), 12-column dashboard grid. */
  x: number;
  /** Grid row (0-based). */
  y: number;
  /** Width in grid columns. */
  w: number;
  /** Height in grid row units. */
  h: number;
}

/** Request body for PATCH /dashboards/:id/layout */
export interface SaveDashboardLayoutRequestDto {
  items: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}
