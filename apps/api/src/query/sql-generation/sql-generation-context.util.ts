import type { GenerateSqlResponseDto } from "@analytics-copilot/shared";
import type { SchemaColumnRow } from "../../database/adapters/database-adapter.interface";
import { assertSafeTableIdentifier } from "../../database/table-identifier.util";
import type { GenerateSqlDto } from "../dto/generate-sql.dto";

export type SchemaColumnBrief = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
};

export type TableModel = {
  tableSchema: string;
  tableName: string;
  columns: SchemaColumnBrief[];
};

export function groupColumns(rows: SchemaColumnRow[]): TableModel[] {
  const map = new Map<string, TableModel>();
  for (const r of rows) {
    const key = `${r.tableSchema}\0${r.tableName}`;
    let t = map.get(key);
    if (!t) {
      t = { tableSchema: r.tableSchema, tableName: r.tableName, columns: [] };
      map.set(key, t);
    }
    t.columns.push({
      name: r.columnName,
      dataType: r.dataType,
      isNullable: r.isNullable,
      isPrimaryKey: Boolean(r.isPrimaryKey),
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    `${a.tableSchema}.${a.tableName}`.localeCompare(`${b.tableSchema}.${b.tableName}`),
  );
}

export function suggestTables(tables: TableModel[]): string[] {
  return tables.slice(0, 20).map((t) => `${t.tableSchema}.${t.tableName}`);
}

export function narrowWorkingTables(
  allTables: TableModel[],
  dto: GenerateSqlDto,
): { working: TableModel[]; error: GenerateSqlResponseDto | null } {
  const multi = dto.selectedTables?.map((s) => String(s).trim()).filter(Boolean) ?? [];
  if (multi.length > 0) {
    const seen = new Set<string>();
    const working: TableModel[] = [];
    const invalid: string[] = [];
    for (const raw of multi) {
      let id: ReturnType<typeof assertSafeTableIdentifier>;
      try {
        id = assertSafeTableIdentifier(raw);
      } catch {
        invalid.push(raw);
        continue;
      }
      const found =
        allTables.find((tb) => tb.tableName === id.table && (!id.schema || tb.tableSchema === id.schema)) ?? null;
      if (!found) {
        invalid.push(raw);
        continue;
      }
      const key = `${found.tableSchema}\0${found.tableName}`;
      if (!seen.has(key)) {
        seen.add(key);
        working.push(found);
      }
    }
    if (invalid.length) {
      return {
        working: [],
        error: {
          status: "needs_clarification",
          generatedSql: null,
          explanation: `Some table names were not found or are not in a safe format: ${invalid.slice(0, 6).join(", ")}${invalid.length > 6 ? "…" : ""}.`,
          needsClarification: true,
          clarificationQuestion: "Which tables should we use? Pick valid tables from the schema list.",
          suggestedTables: suggestTables(allTables),
          providerUsed: "none",
        },
      };
    }
    if (working.length === 0) {
      return {
        working: [],
        error: {
          status: "needs_clarification",
          generatedSql: null,
          explanation: "Choose at least one visible table from your connection.",
          needsClarification: true,
          clarificationQuestion: "Which table or tables define the dataset for this question?",
          suggestedTables: suggestTables(allTables),
          providerUsed: "none",
        },
      };
    }
    return { working, error: null };
  }

  if (dto.selectedTable?.trim()) {
    try {
      const id = assertSafeTableIdentifier(dto.selectedTable.trim());
      const selected =
        allTables.find((t) => t.tableName === id.table && (!id.schema || t.tableSchema === id.schema)) ?? null;
      if (!selected) {
        return {
          working: [],
          error: {
            status: "needs_clarification",
            generatedSql: null,
            explanation: `The table "${dto.selectedTable}" was not found in the live schema for this connection.`,
            needsClarification: true,
            clarificationQuestion:
              "Pick a table that exists on this connection, or clear the selection to use the full visible schema.",
            suggestedTables: suggestTables(allTables),
            providerUsed: "none",
          },
        };
      }
      return { working: [selected], error: null };
    } catch {
      return {
        working: [],
        error: {
          status: "needs_clarification",
          generatedSql: null,
          explanation: "The selected table name is not in a safe format. Use schema.table or a single identifier.",
          needsClarification: true,
          clarificationQuestion: "Use a simple table name like public.orders or orders.",
          suggestedTables: suggestTables(allTables),
          providerUsed: "none",
        },
      };
    }
  }

  return { working: allTables, error: null };
}

/** Cap prompt size when the user did not narrow tables. */
export function limitTablesForPrompt(tables: TableModel[], maxTables: number, maxColsPerTable: number): {
  tables: TableModel[];
  truncated: boolean;
} {
  if (tables.length <= maxTables && tables.every((t) => t.columns.length <= maxColsPerTable)) {
    return { tables, truncated: false };
  }
  const sliced = tables.slice(0, maxTables).map((t) => ({
    ...t,
    columns: t.columns.slice(0, maxColsPerTable),
  }));
  return { tables: sliced, truncated: true };
}
