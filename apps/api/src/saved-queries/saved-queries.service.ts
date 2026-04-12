import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionsService } from "../connections/connections.service";
import { CreateSavedQueryDto } from "./dto/create-saved-query.dto";

@Injectable()
export class SavedQueriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly connections: ConnectionsService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateSavedQueryDto) {
    await this.connections.getById(dto.connectionId, organizationId);
    const created = await this.prisma.savedQuery.create({
      data: {
        organizationId,
        connectionId: dto.connectionId,
        title: dto.title,
        sqlText: dto.sqlText,
        generatedSqlText: dto.generatedSqlText?.trim() || null,
        naturalLanguageQuestion: dto.naturalLanguageQuestion?.trim() || null,
      },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: AuditAction.QUERY_SAVED,
      resourceType: "SavedQuery",
      resourceId: created.id,
    });
    return this.toDto(created);
  }

  async list(organizationId: string) {
    const rows = await this.prisma.savedQuery.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getById(id: string, organizationId: string) {
    const row = await this.prisma.savedQuery.findFirst({
      where: { id, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Saved query not found");
    }
    return this.toDto(row);
  }

  private toDto(row: {
    id: string;
    title: string;
    sqlText: string;
    generatedSqlText: string | null;
    naturalLanguageQuestion: string | null;
    connectionId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      sqlText: row.sqlText,
      generatedSqlText: row.generatedSqlText,
      naturalLanguageQuestion: row.naturalLanguageQuestion,
      connectionId: row.connectionId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
