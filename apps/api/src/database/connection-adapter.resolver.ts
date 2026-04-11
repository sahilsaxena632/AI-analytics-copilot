import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DatabaseAdapterFactory } from "./database-adapter.factory";
import type { DatabaseAdapter } from "./adapters/database-adapter.interface";

/** Loads org-scoped connections and hands out dialect adapters (controllers stay driver-agnostic). */
@Injectable()
export class ConnectionAdapterResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly factory: DatabaseAdapterFactory,
  ) {}

  async resolveActive(connectionId: string, organizationId: string): Promise<DatabaseAdapter> {
    const row = await this.prisma.databaseConnection.findFirst({
      where: { id: connectionId, organizationId, isActive: true },
    });
    if (!row) {
      throw new NotFoundException("Connection not found or inactive");
    }
    return this.factory.fromPrismaRow(row);
  }
}
