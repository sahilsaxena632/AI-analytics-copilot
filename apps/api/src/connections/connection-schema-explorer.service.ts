import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConnectionAdapterResolver } from "../database/connection-adapter.resolver";
import { mapConnectionErrorMessage } from "../database/connection-error.mapper";
import { previewRowsToJsonSafe } from "../database/preview-json.util";
import type { SchemaColumnRow } from "../database/adapters/database-adapter.interface";
import { assertSafeTableIdentifier, decodeTableNameParam } from "../database/table-identifier.util";
import type {
  SchemaExplorerColumnDto,
  SchemaExplorerSchemaDto,
  SchemaExplorerTableDto,
  SchemaTablePreviewDto,
} from "@analytics-copilot/shared";

@Injectable()
export class ConnectionSchemaExplorerService {
  private readonly logger = new Logger(ConnectionSchemaExplorerService.name);

  constructor(private readonly adapterResolver: ConnectionAdapterResolver) {}

  async getLiveSchema(connectionId: string, organizationId: string): Promise<SchemaExplorerSchemaDto> {
    try {
      const adapter = await this.adapterResolver.resolveActive(connectionId, organizationId);
      const rows = await adapter.getSchema();
      return {
        connectionId,
        dialect: adapter.dialect,
        tables: this.groupTables(rows),
      };
    } catch (err) {
      return this.mapAndThrow(err, "schema");
    }
  }

  async getTablePreview(
    connectionId: string,
    organizationId: string,
    tableNameParam: string,
  ): Promise<SchemaTablePreviewDto> {
    const decoded = decodeTableNameParam(tableNameParam);
    const id = assertSafeTableIdentifier(decoded);
    try {
      const adapter = await this.adapterResolver.resolveActive(connectionId, organizationId);
      const preview = await adapter.getTablePreview(decoded);
      return {
        connectionId,
        dialect: adapter.dialect,
        tableSchema: id.schema ?? null,
        tableName: id.table,
        qualifiedName: id.qualified,
        columns: preview.columns,
        rows: previewRowsToJsonSafe(preview.rows),
        truncated: preview.truncated,
      };
    } catch (err) {
      return this.mapAndThrow(err, "preview");
    }
  }

  private groupTables(rows: SchemaColumnRow[]): SchemaExplorerTableDto[] {
    const map = new Map<string, SchemaExplorerTableDto>();
    for (const r of rows) {
      const key = `${r.tableSchema}\0${r.tableName}`;
      let table = map.get(key);
      if (!table) {
        table = { tableSchema: r.tableSchema, tableName: r.tableName, columns: [] };
        map.set(key, table);
      }
      const col: SchemaExplorerColumnDto = {
        columnName: r.columnName,
        dataType: r.dataType,
        isNullable: r.isNullable,
        isPrimaryKey: Boolean(r.isPrimaryKey),
      };
      table.columns.push(col);
    }
    return Array.from(map.values()).sort((a, b) => {
      const s = a.tableSchema.localeCompare(b.tableSchema);
      if (s !== 0) {
        return s;
      }
      return a.tableName.localeCompare(b.tableName);
    });
  }

  private mapAndThrow(err: unknown, context: "schema" | "preview"): never {
    if (err instanceof NotFoundException || err instanceof BadRequestException) {
      throw err;
    }
    const raw = err instanceof Error ? err.message : "Request failed";
    const dialect = this.inferDialectFromDriverMessage(raw);
    this.logger.warn(`Schema explorer ${context} failed: ${raw}`);
    const lower = raw.toLowerCase();
    if (context === "preview") {
      if (lower.includes("does not exist") || lower.includes("unknown table") || lower.includes("doesn't exist")) {
        throw new BadRequestException("That table was not found or cannot be read with this connection.");
      }
    }
    if (
      lower.includes("econnrefused") ||
      lower.includes("timeout") ||
      lower.includes("etimedout") ||
      lower.includes("network")
    ) {
      throw new BadRequestException("Could not reach the database. Check the host, port, and network, then try again.");
    }
    if (lower.includes("password") || lower.includes("authentication") || lower.includes("access denied")) {
      throw new BadRequestException("Database credentials were rejected. Update the connection and try again.");
    }
    throw new BadRequestException(mapConnectionErrorMessage(raw, dialect));
  }

  private inferDialectFromDriverMessage(raw: string): "postgres" | "mysql" {
    const r = raw.toLowerCase();
    if (r.includes("er_access_denied") || r.includes("mysql2") || r.includes("mysql") || raw.includes("ER_")) {
      return "mysql";
    }
    return "postgres";
  }
}
