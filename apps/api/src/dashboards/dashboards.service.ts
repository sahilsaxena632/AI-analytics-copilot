import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionsService } from "../connections/connections.service";
import { CreateDashboardDto } from "./dto/create-dashboard.dto";
import { CreateDashboardCardDto } from "./dto/create-dashboard-card.dto";

@Injectable()
export class DashboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly connections: ConnectionsService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prisma.dashboard.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { cards: true } },
      },
    });
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      _count: d._count,
    }));
  }

  async create(organizationId: string, dto: CreateDashboardDto) {
    const created = await this.prisma.dashboard.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
      },
    });
    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async getById(id: string, organizationId: string) {
    const dash = await this.prisma.dashboard.findFirst({
      where: { id, organizationId },
      include: {
        cards: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            dashboardId: true,
            title: true,
            chartType: true,
            sqlText: true,
            connectionId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!dash) {
      throw new NotFoundException("Dashboard not found");
    }
    return {
      ...dash,
      cards: dash.cards.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      createdAt: dash.createdAt.toISOString(),
      updatedAt: dash.updatedAt.toISOString(),
    };
  }

  async addCard(
    dashboardId: string,
    organizationId: string,
    userId: string,
    dto: CreateDashboardCardDto,
  ) {
    const dash = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, organizationId },
    });
    if (!dash) {
      throw new NotFoundException("Dashboard not found");
    }
    await this.connections.getById(dto.connectionId, organizationId);

    const card = await this.prisma.dashboardCard.create({
      data: {
        dashboardId,
        connectionId: dto.connectionId,
        title: dto.title,
        chartType: dto.chartType,
        sqlText: dto.sqlText,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: AuditAction.DASHBOARD_CARD_CREATED,
      resourceType: "DashboardCard",
      resourceId: card.id,
      metadata: { dashboardId },
    });

    return {
      id: card.id,
      dashboardId: card.dashboardId,
      title: card.title,
      chartType: card.chartType,
      sqlText: card.sqlText,
      connectionId: card.connectionId,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }
}
