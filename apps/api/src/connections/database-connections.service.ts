import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditAction, ExternalDbProvider, type DatabaseConnection } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateDatabaseConnectionDto } from "./dto/create-database-connection.dto";
import { DatabaseAdapterFactory } from "../database/database-adapter.factory";
import type { ConnectionCredentials } from "../database/connection-credentials.types";

export type SafeDatabaseConnection = {
  id: string;
  name: string;
  type: ExternalDbProvider;
  host: string | null;
  port: number | null;
  database: string | null;
  username: string | null;
  ssl: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class DatabaseConnectionsService {
  private readonly logger = new Logger(DatabaseConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly adapterFactory: DatabaseAdapterFactory,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateDatabaseConnectionDto) {
    const ssl = dto.ssl ?? false;
    const dbType = dto.type === "mysql" ? ExternalDbProvider.mysql : ExternalDbProvider.postgres;

    const credentials: ConnectionCredentials = {
      host: dto.host,
      port: dto.port,
      database: dto.database,
      username: dto.username,
      password: dto.password,
      ssl,
    };

    const adapter = this.adapterFactory.createFromCredentials(dbType, credentials);
    const test = await adapter.testConnection(this.logger, `org=${organizationId} dryRun=${!!dto.dryRun}`);
    if (!test.ok) {
      throw new BadRequestException(test.message);
    }

    if (dto.dryRun) {
      return {
        success: true,
        message: "Connection successful. You can save this connection when you are ready.",
      };
    }

    const created = await this.prisma.databaseConnection.create({
      data: {
        organizationId,
        name: dto.name,
        databaseType: dbType,
        connectionString: "",
        host: dto.host,
        port: dto.port,
        databaseName: dto.database,
        username: dto.username,
        password: dto.password,
        ssl,
        isActive: true,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: AuditAction.CONNECTION_CREATED,
      resourceType: "DatabaseConnection",
      resourceId: created.id,
      metadata: { source: "database-connections", host: dto.host, port: dto.port, databaseType: dbType },
    });

    return {
      success: true,
      message: "Connection saved.",
      connection: this.toSafe(created),
    };
  }

  async list(organizationId: string): Promise<SafeDatabaseConnection[]> {
    const rows = await this.prisma.databaseConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toSafe(r));
  }

  async getById(id: string, organizationId: string): Promise<SafeDatabaseConnection> {
    const row = await this.prisma.databaseConnection.findFirst({
      where: { id, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Connection not found");
    }
    return this.toSafe(row);
  }

  async testSaved(id: string, organizationId: string) {
    const row = await this.prisma.databaseConnection.findFirst({
      where: { id, organizationId, isActive: true },
    });
    if (!row) {
      throw new NotFoundException("Connection not found or inactive");
    }
    const adapter = this.adapterFactory.fromPrismaRow(row);
    const test = await adapter.testConnection(this.logger, `connectionId=${id}`);
    if (!test.ok) {
      throw new BadRequestException(test.message);
    }
    return {
      success: true,
      message: "Connection test succeeded.",
    };
  }

  private toSafe(row: DatabaseConnection): SafeDatabaseConnection {
    return {
      id: row.id,
      name: row.name,
      type: row.databaseType,
      host: row.host,
      port: row.port,
      database: row.databaseName,
      username: row.username,
      ssl: row.ssl,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
