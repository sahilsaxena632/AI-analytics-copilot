import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectionsService } from "../connections/connections.service";
import { CreateDashboardDto } from "./dto/create-dashboard.dto";
import { CreateDashboardCardDto } from "./dto/create-dashboard-card.dto";
import type { DashboardLayoutItemDto } from "./dto/update-dashboard-layout.dto";
import {
  DASHBOARD_GRID_COLS,
  DASHBOARD_LAYOUT_MAX_H,
  DASHBOARD_LAYOUT_MIN_H,
  DASHBOARD_LAYOUT_MIN_W,
} from "./dashboard-layout.constants";

type LayoutRect = { x: number; y: number; w: number; h: number };

function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

@Injectable()
export class DashboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly connections: ConnectionsService,
  ) {}

  private mapCard(c: {
    id: string;
    dashboardId: string;
    title: string;
    chartType: string;
    sqlText: string;
    connectionId: string;
    createdAt: Date;
    updatedAt: Date;
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
  }) {
    return {
      id: c.id,
      dashboardId: c.dashboardId,
      title: c.title,
      chartType: c.chartType,
      sqlText: c.sqlText,
      connectionId: c.connectionId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      x: c.layoutX,
      y: c.layoutY,
      w: c.layoutW,
      h: c.layoutH,
    };
  }

  private async nextDefaultLayoutSlot(dashboardId: string): Promise<LayoutRect> {
    const DEFAULT_W = 6;
    const DEFAULT_H = 6;
    const cards = await this.prisma.dashboardCard.findMany({
      where: { dashboardId },
      select: { layoutY: true, layoutH: true },
    });
    if (cards.length === 0) {
      return { x: 0, y: 0, w: DEFAULT_W, h: DEFAULT_H };
    }
    let maxBottom = 0;
    for (const c of cards) {
      const bottom = c.layoutY + c.layoutH;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    }
    return { x: 0, y: maxBottom, w: DEFAULT_W, h: DEFAULT_H };
  }

  private validateLayoutItems(items: DashboardLayoutItemDto[], expectedIds: Set<string>): void {
    if (expectedIds.size === 0) {
      throw new BadRequestException("This dashboard has no cards to lay out.");
    }
    if (items.length !== expectedIds.size) {
      throw new BadRequestException("Layout must include every card on this dashboard exactly once.");
    }
    const seen = new Set<string>();
    const rects: LayoutRect[] = [];
    for (const it of items) {
      if (!expectedIds.has(it.id)) {
        throw new BadRequestException(`Unknown card id in layout: ${it.id}`);
      }
      if (seen.has(it.id)) {
        throw new BadRequestException(`Duplicate card id in layout: ${it.id}`);
      }
      seen.add(it.id);
      if (it.w < DASHBOARD_LAYOUT_MIN_W || it.h < DASHBOARD_LAYOUT_MIN_H) {
        throw new BadRequestException(
          `Each card must be at least ${DASHBOARD_LAYOUT_MIN_W} columns wide and ${DASHBOARD_LAYOUT_MIN_H} rows tall.`,
        );
      }
      if (it.h > DASHBOARD_LAYOUT_MAX_H) {
        throw new BadRequestException(`Card height cannot exceed ${DASHBOARD_LAYOUT_MAX_H} rows.`);
      }
      if (it.x < 0 || it.y < 0) {
        throw new BadRequestException("Layout positions cannot be negative.");
      }
      if (it.x + it.w > DASHBOARD_GRID_COLS) {
        throw new BadRequestException(`Cards must stay within ${DASHBOARD_GRID_COLS} columns.`);
      }
      rects.push({ x: it.x, y: it.y, w: it.w, h: it.h });
    }
    if (seen.size !== expectedIds.size) {
      throw new BadRequestException("Layout must include every card on this dashboard exactly once.");
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (rectsOverlap(rects[i], rects[j])) {
          throw new BadRequestException("Layout has overlapping cards; adjust positions and try again.");
        }
      }
    }
  }

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
          orderBy: [{ layoutY: "asc" }, { layoutX: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            dashboardId: true,
            title: true,
            chartType: true,
            sqlText: true,
            connectionId: true,
            layoutX: true,
            layoutY: true,
            layoutW: true,
            layoutH: true,
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
      cards: dash.cards.map((c) => this.mapCard(c)),
      createdAt: dash.createdAt.toISOString(),
      updatedAt: dash.updatedAt.toISOString(),
    };
  }

  async updateLayout(dashboardId: string, organizationId: string, items: DashboardLayoutItemDto[]) {
    const dash = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, organizationId },
      select: {
        id: true,
        cards: { select: { id: true } },
      },
    });
    if (!dash) {
      throw new NotFoundException("Dashboard not found");
    }
    const expectedIds = new Set(dash.cards.map((c) => c.id));
    this.validateLayoutItems(items, expectedIds);

    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.dashboardCard.update({
          where: { id: it.id, dashboardId },
          data: {
            layoutX: it.x,
            layoutY: it.y,
            layoutW: it.w,
            layoutH: it.h,
          },
        }),
      ),
    );

    return this.getById(dashboardId, organizationId);
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

    const slot = await this.nextDefaultLayoutSlot(dashboardId);

    const card = await this.prisma.dashboardCard.create({
      data: {
        dashboardId,
        connectionId: dto.connectionId,
        title: dto.title,
        chartType: dto.chartType,
        sqlText: dto.sqlText,
        layoutX: slot.x,
        layoutY: slot.y,
        layoutW: slot.w,
        layoutH: slot.h,
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

    return this.mapCard(card);
  }
}
