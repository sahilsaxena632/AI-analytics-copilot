import { BadRequestException, type Logger } from "@nestjs/common";
import type { FieldPacket, RowDataPacket } from "mysql2";
import { createConnection, type Connection } from "mysql2/promise";
import { prepareReadOnlyQuery } from "@analytics-copilot/shared";
import type { ConnectionCredentials } from "../connection-credentials.types";
import { mapConnectionErrorMessage } from "../connection-error.mapper";
import { SCHEMA_PREVIEW_ROW_LIMIT } from "../schema-preview.constants";
import { assertSafeTableIdentifier } from "../table-identifier.util";
import {
  DEFAULT_ADAPTER_QUERY_ROW_CAP,
  type AdapterExecuteResult,
  type AdapterTestResult,
  type DatabaseAdapter,
  type SchemaColumnRow,
  type TablePreviewResult,
} from "./database-adapter.interface";

const MYSQL_INTROSPECTION = `
SELECT TABLE_SCHEMA AS tableSchema,
       TABLE_NAME AS tableName,
       COLUMN_NAME AS columnName,
       DATA_TYPE AS dataType,
       (IS_NULLABLE = 'YES') AS isNullable,
       (COLUMN_KEY = 'PRI') AS isPrimaryKey
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
LIMIT 5000
`;

export class MysqlAdapter implements DatabaseAdapter {
  readonly dialect = "mysql" as const;

  constructor(private readonly creds: ConnectionCredentials) {}

  private async open(): Promise<Connection> {
    const rejectUnauthorized = process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false";
    return createConnection({
      host: this.creds.host,
      port: this.creds.port,
      user: this.creds.username,
      password: this.creds.password,
      database: this.creds.database,
      connectTimeout: 10_000,
      ssl: this.creds.ssl ? { rejectUnauthorized } : undefined,
    });
  }

  async testConnection(logger: Logger, contextLabel: string): Promise<AdapterTestResult> {
    let conn: Connection | undefined;
    try {
      conn = await this.open();
      await conn.query("SELECT 1 AS ok");
      logger.log(`MySQL connection test succeeded (${contextLabel})`);
      return { ok: true };
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Connection failed";
      logger.warn(`MySQL connection test failed (${contextLabel}): ${raw}`);
      return { ok: false, message: mapConnectionErrorMessage(raw, "mysql") };
    } finally {
      await conn?.end().catch(() => undefined);
    }
  }

  async getSchema(): Promise<SchemaColumnRow[]> {
    const conn = await this.open();
    try {
      const [rows] = await conn.query(MYSQL_INTROSPECTION);
      const list = rows as Record<string, unknown>[];
      return list.map((r) => ({
        tableSchema: pick(r, "tableSchema", "TABLE_SCHEMA"),
        tableName: pick(r, "tableName", "TABLE_NAME"),
        columnName: pick(r, "columnName", "COLUMN_NAME"),
        dataType: pick(r, "dataType", "DATA_TYPE"),
        isNullable: toBool(r.isNullable ?? r.IS_NULLABLE),
        isPrimaryKey: toBool(r.isPrimaryKey),
      }));
    } finally {
      await conn.end().catch(() => undefined);
    }
  }

  async getTablePreview(tableName: string): Promise<TablePreviewResult> {
    const id = assertSafeTableIdentifier(tableName);
    const parts = id.schema ? [id.schema, id.table] : [id.table];
    const quoted = parts.map((p) => "`" + p.replace(/`/g, "``") + "`").join(".");
    const limit = SCHEMA_PREVIEW_ROW_LIMIT;
    const conn = await this.open();
    try {
      const wrapped = `SELECT * FROM ${quoted} LIMIT ${limit + 1}`;
      const [rows, fields] = await conn.query<RowDataPacket[]>(wrapped);
      const rowArr = rows as Record<string, unknown>[];
      const truncated = rowArr.length > limit;
      const sliced = rowArr.slice(0, limit);
      const fieldList = fields as FieldPacket[];
      const columns =
        Array.isArray(fieldList) && fieldList.length > 0
          ? fieldList.map((f) => f.name)
          : sliced[0]
            ? Object.keys(sliced[0])
            : [];
      return { columns, rows: sliced, truncated };
    } finally {
      await conn.end().catch(() => undefined);
    }
  }

  async executeQuery(sql: string): Promise<AdapterExecuteResult> {
    const maxRows = DEFAULT_ADAPTER_QUERY_ROW_CAP;
    const prepared = prepareReadOnlyQuery(sql, "mysql", maxRows);
    if (!prepared.ok) {
      throw new BadRequestException(prepared.error);
    }

    const conn = await this.open();
    try {
      await conn.query("SET SESSION MAX_EXECUTION_TIME = 60000");
      const [rows, fields] = await conn.query<RowDataPacket[]>(prepared.normalizedSql);
      const rowArr = rows as Record<string, unknown>[];
      const truncated = rowArr.length > maxRows;
      const sliced = rowArr.slice(0, maxRows);
      const fieldList = fields as FieldPacket[];
      const columns =
        Array.isArray(fieldList) && fieldList.length > 0
          ? fieldList.map((f) => f.name)
          : sliced[0]
            ? Object.keys(sliced[0])
            : [];
      return {
        columns,
        rows: sliced,
        rowCount: sliced.length,
        truncated,
      };
    } finally {
      await conn.end().catch(() => undefined);
    }
  }
}

function pick(row: Record<string, unknown>, camel: string, upper: string): string {
  const v = row[camel] ?? row[upper];
  return v == null ? "" : String(v);
}

function toBool(v: unknown): boolean {
  if (v === true || v === 1) {
    return true;
  }
  if (typeof v === "string") {
    return v.toUpperCase() === "YES" || v === "1";
  }
  return false;
}
