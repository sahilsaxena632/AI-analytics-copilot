import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { Client } from "pg";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionsService } from "../connections/connections.service";

const INTROSPECTION_SQL = `
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

@Injectable()
export class SchemaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: ConnectionsService,
    private readonly audit: AuditService,
  ) {}

  async refresh(connectionId: string, organizationId: string, userId: string) {
    const connStr = await this.connections.getConnectionStringForExecution(connectionId, organizationId);
    const client = new Client({ connectionString: connStr, statement_timeout: 30_000 });
    await client.connect();
    try {
      const res = await client.query(INTROSPECTION_SQL);
      const columns = res.rows as Record<string, unknown>[];
      const snapshot = await this.prisma.databaseSchema.create({
        data: {
          connectionId,
          schemaJson: { columns } as Prisma.InputJsonValue,
        },
      });
      await this.audit.log({
        organizationId,
        userId,
        action: AuditAction.SCHEMA_REFRESHED,
        resourceType: "DatabaseSchema",
        resourceId: snapshot.id,
        metadata: { columnCount: columns.length },
      });
      return {
        connectionId,
        fetchedAt: snapshot.fetchedAt.toISOString(),
        columns,
      };
    } finally {
      await client.end().catch(() => undefined);
    }
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
