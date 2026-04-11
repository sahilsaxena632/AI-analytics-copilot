import { Injectable } from "@nestjs/common";
import type { GenerateSqlResponseDto } from "@analytics-copilot/shared";
import { ConnectionAdapterResolver } from "../database/connection-adapter.resolver";
import type { SchemaColumnRow } from "../database/adapters/database-adapter.interface";
import { assertSafeTableIdentifier } from "../database/table-identifier.util";
import type { GenerateSqlDto } from "./dto/generate-sql.dto";

type Dialect = "postgres" | "mysql";

type TableModel = {
  tableSchema: string;
  tableName: string;
  columns: { name: string; dataType: string }[];
};

@Injectable()
export class SqlGenerationService {
  constructor(private readonly adapterResolver: ConnectionAdapterResolver) {}

  /**
   * Rule-based NL → SQL. Swap this class for an LLM-backed implementation later;
   * keep the public method signature and `GenerateSqlResponseDto` stable.
   */
  async generate(organizationId: string, dto: GenerateSqlDto): Promise<GenerateSqlResponseDto> {
    const adapter = await this.adapterResolver.resolveActive(dto.databaseConnectionId, organizationId);
    const dialect = adapter.dialect;
    const flat = await adapter.getSchema();
    const tables = groupColumns(flat);
    if (tables.length === 0) {
      return {
        status: "needs_clarification",
        generatedSql: null,
        explanation:
          "This connection has no visible user tables (or metadata could not be read). Check permissions or add tables, then try again.",
      };
    }

    const q = `${dto.question} ${dto.schemaContext ?? ""}`.trim();
    const normalized = q.toLowerCase();

    let selected: TableModel | null = null;
    if (dto.selectedTable?.trim()) {
      try {
        const id = assertSafeTableIdentifier(dto.selectedTable.trim());
        selected =
          tables.find((t) => t.tableName === id.table && (!id.schema || t.tableSchema === id.schema)) ?? null;
        if (!selected) {
          return {
            status: "needs_clarification",
            generatedSql: null,
            explanation: `The table "${dto.selectedTable}" was not found in the live schema for this connection.`,
            suggestedTables: suggestTables(tables),
          };
        }
      } catch {
        return {
          status: "needs_clarification",
          generatedSql: null,
          explanation: "The selected table name is not in a safe format. Use schema.table or a single identifier.",
          suggestedTables: suggestTables(tables),
        };
      }
    }

    const resolved = selected ?? resolveTableFromQuestion(normalized, tables);
    if (!resolved) {
      return {
        status: "needs_clarification",
        generatedSql: null,
        explanation:
          "Say which table to use (for example pick one in the UI), or name a table in your question. Here are some tables we can see:",
        suggestedTables: suggestTables(tables),
      };
    }

    const quoted = quoteTable(dialect, resolved.tableSchema, resolved.tableName);
    const intent = detectIntent(normalized, resolved);

    const out = buildSql(dialect, quoted, resolved, intent);
    return {
      status: "ok",
      generatedSql: out.sql,
      explanation: out.explanation,
      confidence: out.confidence,
    };
  }
}

function suggestTables(tables: TableModel[]): string[] {
  return tables.slice(0, 20).map((t) => `${t.tableSchema}.${t.tableName}`);
}

function groupColumns(rows: SchemaColumnRow[]): TableModel[] {
  const map = new Map<string, TableModel>();
  for (const r of rows) {
    const key = `${r.tableSchema}\0${r.tableName}`;
    let t = map.get(key);
    if (!t) {
      t = { tableSchema: r.tableSchema, tableName: r.tableName, columns: [] };
      map.set(key, t);
    }
    t.columns.push({ name: r.columnName, dataType: r.dataType });
  }
  return Array.from(map.values()).sort((a, b) =>
    `${a.tableSchema}.${a.tableName}`.localeCompare(`${b.tableSchema}.${b.tableName}`),
  );
}

function resolveTableFromQuestion(normalized: string, tables: TableModel[]): TableModel | null {
  for (const t of tables) {
    const re = new RegExp(`\\b${escapeRe(t.tableName)}\\b`, "i");
    if (re.test(normalized)) {
      return t;
    }
  }
  if (tables.length === 1) {
    return tables[0];
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Intent =
  | { kind: "count" }
  | { kind: "sample"; limit: number }
  | { kind: "sum_by_month"; dateCol: string; measureCol: string }
  | { kind: "group_category"; categoryCol: string; measureCol: string }
  | { kind: "top_n"; n: number; order: "desc" | "asc"; sortCol: string }
  | { kind: "aggregate_one"; fn: "avg" | "sum"; col: string };

function detectIntent(normalized: string, table: TableModel): Intent {
  if (/\b(how many|count rows?|row count|number of rows?)\b/.test(normalized)) {
    return { kind: "count" };
  }
  const topMatch = normalized.match(/\b(top|first)\s+(\d+)\b/);
  const sortCol = pickSortableColumn(table);
  if (topMatch && sortCol) {
    return { kind: "top_n", n: Math.min(100, Math.max(1, parseInt(topMatch[2], 10))), order: "desc", sortCol };
  }
  if (/\b(top|first|highest|largest|best)\b/.test(normalized) && sortCol) {
    return { kind: "top_n", n: 10, order: "desc", sortCol };
  }
  if (/\b(bottom|lowest|smallest|worst)\b/.test(normalized) && sortCol) {
    return { kind: "top_n", n: 10, order: "asc", sortCol };
  }
  const dateCol = pickDateColumn(table);
  const measureCol = pickMeasureColumn(table);
  if (/\b(by month|monthly|per month|each month|over time|trend|revenue by month|sales by month)\b/.test(normalized)) {
    if (dateCol && measureCol) {
      return { kind: "sum_by_month", dateCol, measureCol };
    }
  }
  if (/\b(by region|per region|orders by region|group by region)\b/.test(normalized)) {
    const cat = pickCategoryColumn(table, "region");
    if (cat && measureCol) {
      return { kind: "group_category", categoryCol: cat, measureCol };
    }
  }
  if (/\b(average|avg|mean)\b/.test(normalized)) {
    const col = pickMeasureColumn(table);
    if (col) {
      return { kind: "aggregate_one", fn: "avg", col };
    }
  }
  if (/\b(sum|total|revenue|sales)\b/.test(normalized)) {
    const col = pickMeasureColumn(table);
    if (col) {
      return { kind: "aggregate_one", fn: "sum", col };
    }
  }
  const lim = /\b(list|show|all|everything|preview|sample)\b/.test(normalized) ? 200 : 50;
  return { kind: "sample", limit: lim };
}

function pickDateColumn(table: TableModel): string | null {
  const byType = table.columns.find((c) => isDateType(c.dataType));
  if (byType) {
    return byType.name;
  }
  const byName = table.columns.find((c) =>
    /(^|_)(date|time|at|on)($|_)/i.test(c.name),
  );
  return byName?.name ?? null;
}

function pickMeasureColumn(table: TableModel): string | null {
  const prefer = table.columns.find(
    (c) =>
      isNumericType(c.dataType) &&
      /amount|revenue|total|price|value|sales|qty|quantity|count|sum|cost|payment/i.test(c.name),
  );
  if (prefer) {
    return prefer.name;
  }
  const anyNum = table.columns.find((c) => isNumericType(c.dataType));
  return anyNum?.name ?? null;
}

function pickCategoryColumn(table: TableModel, hint: string): string | null {
  const byHint = table.columns.find(
    (c) => isStringLike(c.dataType) && c.name.toLowerCase().includes(hint),
  );
  if (byHint) {
    return byHint.name;
  }
  const anyStr = table.columns.find((c) => isStringLike(c.dataType));
  return anyStr?.name ?? null;
}

function pickSortableColumn(table: TableModel): string | null {
  const n = pickMeasureColumn(table);
  if (n) {
    return n;
  }
  const d = pickDateColumn(table);
  return d;
}

function isNumericType(dt: string): boolean {
  return /int|decimal|numeric|float|double|real|money|serial|bigint|smallint|mediumint|bit/i.test(dt);
}

function isDateType(dt: string): boolean {
  const d = dt.toLowerCase();
  if (/varchar|char|text|blob|binary|enum|set|json/i.test(d)) {
    return false;
  }
  return /date|time|timestamp|year/i.test(d);
}

function isStringLike(dt: string): boolean {
  const d = dt.toLowerCase();
  return /char|text|enum|set|json/i.test(d);
}

function quoteIdent(dialect: Dialect, name: string): string {
  if (dialect === "mysql") {
    return "`" + name.replace(/`/g, "``") + "`";
  }
  return `"` + name.replace(/"/g, '""') + `"`;
}

function quoteTable(dialect: Dialect, schema: string, table: string): string {
  return `${quoteIdent(dialect, schema)}.${quoteIdent(dialect, table)}`;
}

function buildSql(
  dialect: Dialect,
  quotedTable: string,
  table: TableModel,
  intent: Intent,
): { sql: string; explanation: string; confidence: "low" | "medium" | "high" } {
  switch (intent.kind) {
    case "count": {
      return {
        sql: `SELECT COUNT(*) AS row_count FROM ${quotedTable}`,
        explanation: `Counts all rows in ${table.tableName}.`,
        confidence: "high",
      };
    }
    case "sample": {
      return {
        sql: `SELECT * FROM ${quotedTable} LIMIT ${intent.limit}`,
        explanation: `Returns up to ${intent.limit} rows from ${table.tableName}. Narrow your question for totals, trends, or breakdowns.`,
        confidence: "low",
      };
    }
    case "aggregate_one": {
      const qc = quoteIdent(dialect, intent.col);
      const fn = intent.fn.toUpperCase();
      return {
        sql: `SELECT ${fn}(${qc}) AS ${intent.fn}_${intent.col} FROM ${quotedTable}`,
        explanation: `Computes ${fn} of ${intent.col} across ${table.tableName}.`,
        confidence: "medium",
      };
    }
    case "top_n": {
      const qc = quoteIdent(dialect, intent.sortCol);
      const dir = intent.order.toUpperCase();
      return {
        sql: `SELECT * FROM ${quotedTable} ORDER BY ${qc} ${dir} LIMIT ${intent.n}`,
        explanation: `Lists the ${intent.n} rows with ${intent.order === "desc" ? "highest" : "lowest"} ${intent.sortCol} in ${table.tableName}.`,
        confidence: "medium",
      };
    }
    case "sum_by_month": {
      const qd = quoteIdent(dialect, intent.dateCol);
      const qm = quoteIdent(dialect, intent.measureCol);
      if (dialect === "postgres") {
        return {
          sql:
            `SELECT DATE_TRUNC('month', ${qd}::timestamp) AS month, SUM(${qm}) AS total\n` +
            `FROM ${quotedTable}\n` +
            `GROUP BY 1\n` +
            `ORDER BY 1`,
          explanation: `Sums ${intent.measureCol} by calendar month using ${intent.dateCol} on ${table.tableName}.`,
          confidence: "medium",
        };
      }
      return {
        sql:
          `SELECT DATE_FORMAT(${qd}, '%Y-%m-01') AS month, SUM(${qm}) AS total\n` +
          `FROM ${quotedTable}\n` +
          `GROUP BY 1\n` +
          `ORDER BY 1`,
        explanation: `Sums ${intent.measureCol} by month using ${intent.dateCol} on ${table.tableName}.`,
        confidence: "medium",
      };
    }
    case "group_category": {
      const qc = quoteIdent(dialect, intent.categoryCol);
      const qm = quoteIdent(dialect, intent.measureCol);
      return {
        sql:
          `SELECT ${qc} AS ${intent.categoryCol}, SUM(${qm}) AS total\n` +
          `FROM ${quotedTable}\n` +
          `GROUP BY ${qc}\n` +
          `ORDER BY total DESC\n` +
          `LIMIT 50`,
        explanation: `Totals ${intent.measureCol} for each ${intent.categoryCol} in ${table.tableName}.`,
        confidence: "medium",
      };
    }
  }
}
