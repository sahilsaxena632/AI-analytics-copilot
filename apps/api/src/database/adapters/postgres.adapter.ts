import { BadRequestException, type Logger } from "@nestjs/common";
import { Client } from "pg";
import { assertReadOnlySql } from "@analytics-copilot/shared";
import { buildPostgresConnectionUri } from "../uri/postgres-uri.builder";
import type { ConnectionCredentials } from "../connection-credentials.types";
import { mapConnectionErrorMessage } from "../connection-error.mapper";
import {
  DEFAULT_ADAPTER_QUERY_ROW_CAP,
  type AdapterExecuteResult,
  type AdapterTestResult,
  type DatabaseAdapter,
  type SchemaColumnRow,
  type TablePreviewResult,
} from "./database-adapter.interface";

export type PostgresAdapterConfig =
  | { kind: "credentials"; credentials: ConnectionCredentials }
  | { kind: "uri"; connectionUri: string };

const PG_INTROSPECTION = `
SELECT table_schema AS "tableSchema",
       table_name AS "tableName",
       column_name AS "columnName",
       data_type AS "dataType",
       (is_nullable = 'YES') AS "isNullable"
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, ordinal_position
LIMIT 5000
`;

export class PostgresAdapter implements DatabaseAdapter {
  readonly dialect = "postgres" as const;

  constructor(private readonly config: PostgresAdapterConfig) {}

  private connectionString(): string {
    if (this.config.kind === "uri") {
      return this.config.connectionUri;
    }
    const c = this.config.credentials;
    return buildPostgresConnectionUri({
      host: c.host,
      port: c.port,
      database: c.database,
      username: c.username,
      password: c.password,
      ssl: c.ssl,
    });
  }

  async testConnection(logger: Logger, contextLabel: string): Promise<AdapterTestResult> {
    const client = new Client({
      connectionString: this.connectionString(),
      connectionTimeoutMillis: 10_000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1 AS ok");
      logger.log(`PostgreSQL connection test succeeded (${contextLabel})`);
      return { ok: true };
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Connection failed";
      logger.warn(`PostgreSQL connection test failed (${contextLabel}): ${raw}`);
      return { ok: false, message: mapConnectionErrorMessage(raw, "postgres") };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async getSchema(): Promise<SchemaColumnRow[]> {
    const client = new Client({
      connectionString: this.connectionString(),
      statement_timeout: 30_000,
    });
    await client.connect();
    try {
      const res = await client.query(PG_INTROSPECTION);
      return res.rows as SchemaColumnRow[];
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async getTablePreview(_tableName: string): Promise<TablePreviewResult> {
    // TODO: quote identifiers, optional schema.table, LIMIT sample size, timeout
    void _tableName;
    return { columns: [], rows: [], truncated: false };
  }

  async executeQuery(sql: string): Promise<AdapterExecuteResult> {
    try {
      assertReadOnlySql(sql);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Invalid SQL");
    }
    const maxRows = DEFAULT_ADAPTER_QUERY_ROW_CAP;
    const client = new Client({
      connectionString: this.connectionString(),
      statement_timeout: 60_000,
    });
    await client.connect();
    try {
      const wrapped = `SELECT * FROM (${sql}) AS _q LIMIT ${maxRows + 1}`;
      const res = await client.query(wrapped);
      const truncated = res.rowCount != null && res.rowCount > maxRows;
      const rows = res.rows.slice(0, maxRows).map((r) => ({ ...r }));
      const columns = res.fields.map((f) => f.name);
      return { columns, rows, rowCount: rows.length, truncated };
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
