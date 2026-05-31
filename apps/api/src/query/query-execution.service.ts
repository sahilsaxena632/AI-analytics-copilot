import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionAdapterResolver } from "../database/connection-adapter.resolver";
import { DEFAULT_ADAPTER_QUERY_ROW_CAP } from "../database/adapters/database-adapter.interface";
import { previewRowsToJsonSafe } from "../database/preview-json.util";

@Injectable()
export class QueryExecutionService {
  private readonly logger = new Logger(QueryExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterResolver: ConnectionAdapterResolver,
    private readonly audit: AuditService,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    connectionId: string,
    sql: string,
    savedQueryId?: string | null,
    naturalLanguageQuestion?: string | null,
  ): Promise<QueryExecuteResultDto> {
    const normalized = sql.trim().replace(/;+\s*$/g, "").trim();
    if (!normalized) {
      throw new BadRequestException("Add a SQL query before running.");
    }

    if (savedQueryId) {
      const saved = await this.prisma.savedQuery.findFirst({
        where: { id: savedQueryId, organizationId },
      });
      if (!saved || saved.connectionId !== connectionId) {
        throw new BadRequestException("savedQueryId does not match connection or organization");
      }
    }

    const adapter = await this.adapterResolver.resolveActive(connectionId, organizationId);
    const started = Date.now();
    try {
      const { columns, rows, rowCount, truncated } = await adapter.executeQuery(normalized);
      const durationMs = Date.now() - started;
      const safeRows = previewRowsToJsonSafe(rows);
      const warnings: string[] = [];
      if (truncated) {
        warnings.push(`Results were capped at ${DEFAULT_ADAPTER_QUERY_ROW_CAP} rows for safety.`);
      }

      this.logger.log(
        `Query executed ok connectionId=${connectionId} rows=${safeRows.length} durationMs=${durationMs} dialect=${adapter.dialect}`,
      );

      await this.prisma.queryRun.create({
        data: {
          organizationId,
          connectionId,
          savedQueryId: savedQueryId || null,
          sqlText: sql,
          naturalLanguageQuestion: naturalLanguageQuestion?.trim() || null,
          rowCount: safeRows.length,
          success: true,
          durationMs,
        },
      });

      await this.audit.log({
        organizationId,
        userId,
        action: AuditAction.QUERY_EXECUTED,
        resourceType: "QueryRun",
        metadata: { connectionId, rowCount: safeRows.length, truncated, dialect: adapter.dialect, durationMs },
      });

      return {
        columns,
        rows: safeRows,
        rowCount,
        truncated,
        durationMs,
        warnings: warnings.length ? warnings : undefined,
      };
    } catch (err) {
      const durationMs = Date.now() - started;
      let message = "Query failed";
      if (err instanceof BadRequestException) {
        const body = err.getResponse();
        message = typeof body === "string" ? body : err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      this.logger.warn(`Query execution failed connectionId=${connectionId} durationMs=${durationMs}: ${message}`);
      await this.prisma.queryRun.create({
        data: {
          organizationId,
          connectionId,
          savedQueryId: savedQueryId || null,
          sqlText: sql,
          naturalLanguageQuestion: naturalLanguageQuestion?.trim() || null,
          success: false,
          errorMessage: message,
          durationMs,
        },
      });
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(message);
    }
  }
}
