import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionsService } from "../connections/connections.service";
import { ConnectionAdapterResolver } from "../database/connection-adapter.resolver";

@Injectable()
export class SchemaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: ConnectionsService,
    private readonly adapterResolver: ConnectionAdapterResolver,
    private readonly audit: AuditService,
  ) {}

  async refresh(connectionId: string, organizationId: string, userId: string) {
    const adapter = await this.adapterResolver.resolveActive(connectionId, organizationId);
    const columns = await adapter.getSchema();
    const snapshot = await this.prisma.databaseSchema.create({
      data: {
        connectionId,
        schemaJson: { columns } as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: AuditAction.SCHEMA_REFRESHED,
      resourceType: "DatabaseSchema",
      resourceId: snapshot.id,
      metadata: { columnCount: columns.length, dialect: adapter.dialect },
    });
    return {
      connectionId,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      columns,
    };
  }

  async latest(connectionId: string, organizationId: string) {
    await this.connections.getById(connectionId, organizationId);
    const latest = await this.prisma.databaseSchema.findFirst({
      where: { connectionId },
      orderBy: { fetchedAt: "desc" },
    });
    if (!latest) {
      return null;
    }
    const json = latest.schemaJson as { columns?: unknown[] };
    return {
      connectionId,
      fetchedAt: latest.fetchedAt.toISOString(),
      columns: json.columns ?? [],
    };
  }
}
