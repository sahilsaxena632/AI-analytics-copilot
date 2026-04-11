import { BadRequestException, Injectable } from "@nestjs/common";
import { type AskQuestionResponseDto, type QueryExecuteResultDto } from "@analytics-copilot/shared";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionsService } from "../connections/connections.service";
import { ConnectionAdapterResolver } from "../database/connection-adapter.resolver";

@Injectable()
export class QueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: ConnectionsService,
    private readonly adapterResolver: ConnectionAdapterResolver,
    private readonly audit: AuditService,
  ) {}

  async askQuestion(organizationId: string, connectionId: string, question: string): Promise<AskQuestionResponseDto> {
    await this.connections.getById(connectionId, organizationId);
    const adapter = await this.adapterResolver.resolveActive(connectionId, organizationId);
    const generatedSql =
      adapter.dialect === "mysql"
        ? `SELECT DATABASE() AS \`database\`, NOW() AS server_time;`
        : `SELECT current_database() AS database, now() AS server_time;`;
    return {
      generatedSql,
      explanation: `Placeholder (LLM TODO). Your question was: "${question.slice(0, 400)}"`,
    };
  }

  async execute(
    organizationId: string,
    userId: string,
    connectionId: string,
    sql: string,
    savedQueryId?: string | null,
  ): Promise<QueryExecuteResultDto> {
    let normalized = sql.trim().replace(/;+\s*$/g, "").trim();

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

      await this.prisma.queryRun.create({
        data: {
          connectionId,
          savedQueryId: savedQueryId || null,
          sqlText: sql,
          rowCount: rows.length,
          success: true,
          durationMs,
        },
      });

      await this.audit.log({
        organizationId,
        userId,
        action: AuditAction.QUERY_EXECUTED,
        resourceType: "QueryRun",
        metadata: { connectionId, rowCount: rows.length, truncated, dialect: adapter.dialect },
      });

      return {
        columns,
        rows,
        rowCount,
        truncated,
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
      await this.prisma.queryRun.create({
        data: {
          connectionId,
          savedQueryId: savedQueryId || null,
          sqlText: sql,
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

  async listRuns(organizationId: string, connectionId?: string) {
    const where = {
      connection: { organizationId },
      ...(connectionId ? { connectionId } : {}),
    };
    return this.prisma.queryRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        connectionId: true,
        sqlText: true,
        rowCount: true,
        success: true,
        errorMessage: true,
        durationMs: true,
        createdAt: true,
      },
    });
  }
}
