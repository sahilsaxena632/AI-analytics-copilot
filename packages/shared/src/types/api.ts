/** Column metadata from information_schema (subset). */
export interface SchemaColumnDto {
  tableSchema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
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

export interface QueryExecuteResultDto {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
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
