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

/** Response from POST /queries/generate-sql (LLM-ready contract). */
export interface GenerateSqlResponseDto {
  status: GenerateSqlStatus;
  generatedSql: string | null;
  explanation: string;
  confidence?: SqlGenerationConfidence;
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
  naturalLanguageQuestion?: string | null;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
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
}
