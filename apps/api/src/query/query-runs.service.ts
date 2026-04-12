import { Injectable } from "@nestjs/common";
import type { ExternalDbProvider } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type QueryRunHistoryRow = {
  id: string;
  connectionId: string;
  connectionName: string;
  databaseType: ExternalDbProvider;
  sqlText: string;
  naturalLanguageQuestion: string | null;
  savedQueryId: string | null;
  savedQueryTitle: string | null;
  savedQueryQuestion: string | null;
  rowCount: number | null;
  success: boolean;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
};

@Injectable()
export class QueryRunsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, connectionId?: string): Promise<QueryRunHistoryRow[]> {
    const rows = await this.prisma.queryRun.findMany({
      where: {
        connection: { organizationId },
        ...(connectionId ? { connectionId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        connectionId: true,
        sqlText: true,
        naturalLanguageQuestion: true,
        savedQueryId: true,
        rowCount: true,
        success: true,
        errorMessage: true,
        durationMs: true,
        createdAt: true,
        savedQuery: {
          select: { title: true, naturalLanguageQuestion: true },
        },
        connection: {
          select: { name: true, databaseType: true },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      connectionId: r.connectionId,
      connectionName: r.connection.name,
      databaseType: r.connection.databaseType,
      sqlText: r.sqlText,
      naturalLanguageQuestion: r.naturalLanguageQuestion,
      savedQueryId: r.savedQueryId,
      savedQueryTitle: r.savedQuery?.title ?? null,
      savedQueryQuestion: r.savedQuery?.naturalLanguageQuestion ?? null,
      rowCount: r.rowCount,
      success: r.success,
      errorMessage: r.errorMessage,
      durationMs: r.durationMs,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
