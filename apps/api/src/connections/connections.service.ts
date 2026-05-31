import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { AuditAction, ExternalDbProvider } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CredentialEncryptionService } from "../database/credential-encryption.service";
import { CreateConnectionDto } from "./dto/create-connection.dto";

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly credentialEncryption: CredentialEncryptionService,
  ) {}

  async list(organizationId: string) {
    return this.prisma.databaseConnection.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        databaseType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string, organizationId: string) {
    const conn = await this.prisma.databaseConnection.findFirst({
      where: { id, organizationId },
    });
    if (!conn) {
      throw new NotFoundException("Connection not found");
    }
    return conn;
  }

  async create(organizationId: string, userId: string, dto: CreateConnectionDto) {
    const created = await this.prisma.databaseConnection.create({
      data: {
        organizationId,
        name: dto.name,
        databaseType: ExternalDbProvider.postgres,
        connectionString: this.credentialEncryption.encrypt(dto.connectionString) ?? "",
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: AuditAction.CONNECTION_CREATED,
      resourceType: "DatabaseConnection",
      resourceId: created.id,
    });
    return {
      id: created.id,
      name: created.name,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  assertOrg(connOrgId: string, userOrgId: string) {
    if (connOrgId !== userOrgId) {
      throw new ForbiddenException();
    }
  }
}
