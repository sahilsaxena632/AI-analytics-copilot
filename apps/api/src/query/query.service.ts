import { BadRequestException, Injectable } from "@nestjs/common";
import { assertReadOnlySql, type AskQuestionResponseDto, type QueryExecuteResultDto } from "@analytics-copilot/shared";
import { AuditAction } from "@prisma/client";
import { Client } from "pg";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionsService } from "../connections/connections.service";

const MAX_ROWS = 500;

@Injectable()
export class QueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: ConnectionsService,
    private readonly audit: AuditService,
  ) {}

  async askQuestion(organizationId: string, connectionId: string, question: string): Promise<AskQuestionResponseDto> {
    await this.connections.getById(connectionId, organizationId);
    // Avoid embedding free-form text in SQL comments — assertReadOnlySql scans the full string and could match keywords.
    const generatedSql = `SELECT current_database() AS database, now() AS server_time;`;
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
    let normalized = sql.trim();
    try {
      assertReadOnlySql(normalized);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Invalid SQL");
    }
    normalized = normalized.replace(/;+\s*$/g, "").trim();

    if (savedQueryId) {
      const saved = await this.prisma.savedQuery.findFirst({
        where: { id: savedQueryId, organizationId },
      });
      if (!saved || saved.connectionId !== connectionId) {
        throw new BadRequestException("savedQueryId does not match connection or organization");
      }
    }

    const connStr = await this.connections.getConnectionStringForExecution(connectionId, organizationId);
    const client = new Client({
      connectionString: connStr,
      statement_timeout: 60_000,
    });
    const started = Date.now();
    await client.connect();
    try {
      const wrapped = `SELECT * FROM (${normalized}) AS _q LIMIT ${MAX_ROWS + 1}`;
      const res = await client.query(wrapped);
      const truncated = res.rowCount != null && res.rowCount > MAX_ROWS;
      const rows = res.rows.slice(0, MAX_ROWS).map((r) => ({ ...r }));
      const columns = res.fields.map((f) => f.name);
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
        metadata: { connectionId, rowCount: rows.length, truncated },
      });

      return {
        columns,
        rows,
        rowCount: rows.length,
        truncated,
      };
    } catch (err) {
      const durationMs = Date.now() - started;
      const message = err instanceof Error ? err.message : "Query failed";
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
      throw new BadRequestException(message);
    } finally {
      await client.end().catch(() => undefined);
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
