import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUserPayload } from "../common/decorators/current-user.decorator";
import {
  UpdateSettingsDto,
  UpdateUserSettingsDto,
  UpdateWorkspaceSettingsDto,
} from "./dto/update-settings.dto";

const DEFAULT_NOTIFICATIONS = {
  anomalyAlerts: true,
  scheduledReports: true,
  dashboardRefresh: false,
  inApp: true,
  email: false,
};

const DEFAULT_DASHBOARD_DEFAULTS = {
  defaultLayout: "balanced",
  refreshInterval: "manual",
};

function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function definedObject(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(user: AuthUserPayload) {
    const [userSettings, workspaceSettings, databases] = await Promise.all([
      this.getUserSettings(user),
      this.getWorkspaceSettings(user),
      this.getDatabases(user.organizationId),
    ]);

    return {
      user: userSettings,
      workspace: workspaceSettings,
      databases,
    };
  }

  async updateSettings(user: AuthUserPayload, dto: UpdateSettingsDto) {
    if (dto.user) {
      await this.updateUserSettings(user, dto.user);
    }
    if (dto.workspace) {
      await this.updateWorkspaceSettings(user, dto.workspace);
    }
    return this.getSettings(user);
  }

  async getUserSettings(user: AuthUserPayload) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { settings: true },
    });
    if (!row) {
      throw new NotFoundException("User not found");
    }

    const settings =
      row.settings ??
      (await this.prisma.userSettings.create({
        data: {
          userId: user.userId,
          displayName: row.name,
        },
      }));

    return {
      displayName: settings.displayName ?? row.name ?? "",
      email: row.email,
      role: "Workspace member",
      theme: settings.theme,
      locale: settings.locale,
      density: settings.density,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  async updateUserSettings(user: AuthUserPayload, dto: UpdateUserSettingsDto) {
    if (dto.displayName !== undefined) {
      await this.prisma.user.update({
        where: { id: user.userId },
        data: { name: dto.displayName.trim() || null },
      });
    }

    await this.prisma.userSettings.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        displayName: dto.displayName?.trim() || undefined,
        theme: dto.theme,
        locale: dto.locale,
        density: dto.density,
      },
      update: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() || null } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
        ...(dto.density !== undefined ? { density: dto.density } : {}),
      },
    });

    return this.getUserSettings(user);
  }

  async getWorkspaceSettings(user: AuthUserPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { settings: true },
    });
    if (!org) {
      throw new NotFoundException("Workspace not found");
    }

    const settings =
      org.settings ??
      (await this.prisma.workspaceSettings.create({
        data: { organizationId: user.organizationId },
      }));

    return {
      organizationName: org.name,
      timezone: settings.timezone,
      defaultDatabaseConnectionId: settings.defaultDatabaseConnectionId,
      defaultQueryRowLimit: settings.defaultQueryRowLimit,
      defaultSchemaContextMode: settings.defaultSchemaContextMode,
      showSqlByDefault: settings.showSqlByDefault,
      showExplanationByDefault: settings.showExplanationByDefault,
      autoRunGeneratedSql: settings.autoRunGeneratedSql,
      autoChart: settings.autoChart,
      defaultChartType: settings.defaultChartType,
      kpiFirst: settings.kpiFirst,
      chartCollapsedByDefault: settings.chartCollapsedByDefault,
      chartDensity: settings.chartDensity,
      clarificationMode: settings.clarificationMode,
      lowConfidenceWarning: settings.lowConfidenceWarning,
      preferredLlmProvider: settings.preferredLlmProvider,
      preferredLlmModel: settings.preferredLlmModel,
      notifications: {
        ...DEFAULT_NOTIFICATIONS,
        ...jsonObject(settings.notifications),
      },
      dashboardDefaults: {
        ...DEFAULT_DASHBOARD_DEFAULTS,
        ...jsonObject(settings.dashboardDefaults),
      },
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  async updateWorkspaceSettings(user: AuthUserPayload, dto: UpdateWorkspaceSettingsDto) {
    if (dto.defaultDatabaseConnectionId) {
      const connection = await this.prisma.databaseConnection.findFirst({
        where: {
          id: dto.defaultDatabaseConnectionId,
          organizationId: user.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!connection) {
        throw new BadRequestException("Default database connection must be an active connection in this workspace.");
      }
    }

    if (dto.organizationName !== undefined) {
      await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: { name: dto.organizationName.trim() || "Untitled workspace" },
      });
    }

    const existing = await this.prisma.workspaceSettings.upsert({
      where: { organizationId: user.organizationId },
      create: { organizationId: user.organizationId },
      update: {},
    });

    await this.prisma.workspaceSettings.update({
      where: { organizationId: user.organizationId },
      data: {
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.defaultDatabaseConnectionId !== undefined
          ? { defaultDatabaseConnectionId: dto.defaultDatabaseConnectionId }
          : {}),
        ...(dto.defaultQueryRowLimit !== undefined ? { defaultQueryRowLimit: dto.defaultQueryRowLimit } : {}),
        ...(dto.defaultSchemaContextMode !== undefined ? { defaultSchemaContextMode: dto.defaultSchemaContextMode } : {}),
        ...(dto.showSqlByDefault !== undefined ? { showSqlByDefault: dto.showSqlByDefault } : {}),
        ...(dto.showExplanationByDefault !== undefined
          ? { showExplanationByDefault: dto.showExplanationByDefault }
          : {}),
        ...(dto.autoRunGeneratedSql !== undefined ? { autoRunGeneratedSql: dto.autoRunGeneratedSql } : {}),
        ...(dto.autoChart !== undefined ? { autoChart: dto.autoChart } : {}),
        ...(dto.defaultChartType !== undefined ? { defaultChartType: dto.defaultChartType } : {}),
        ...(dto.kpiFirst !== undefined ? { kpiFirst: dto.kpiFirst } : {}),
        ...(dto.chartCollapsedByDefault !== undefined
          ? { chartCollapsedByDefault: dto.chartCollapsedByDefault }
          : {}),
        ...(dto.chartDensity !== undefined ? { chartDensity: dto.chartDensity } : {}),
        ...(dto.clarificationMode !== undefined ? { clarificationMode: dto.clarificationMode } : {}),
        ...(dto.lowConfidenceWarning !== undefined ? { lowConfidenceWarning: dto.lowConfidenceWarning } : {}),
        ...(dto.preferredLlmProvider !== undefined ? { preferredLlmProvider: dto.preferredLlmProvider } : {}),
        ...(dto.preferredLlmModel !== undefined ? { preferredLlmModel: dto.preferredLlmModel?.trim() || null } : {}),
        ...(dto.notifications
          ? {
              notifications: {
                ...DEFAULT_NOTIFICATIONS,
                ...jsonObject(existing.notifications),
                ...definedObject(dto.notifications),
              } as Prisma.InputJsonObject,
            }
          : {}),
        ...(dto.dashboardDefaults
          ? {
              dashboardDefaults: {
                ...DEFAULT_DASHBOARD_DEFAULTS,
                ...jsonObject(existing.dashboardDefaults),
                ...definedObject(dto.dashboardDefaults),
              } as Prisma.InputJsonObject,
            }
          : {}),
      },
    });

    return this.getWorkspaceSettings(user);
  }

  async getDatabases(organizationId: string) {
    const [settings, rows] = await Promise.all([
      this.prisma.workspaceSettings.findUnique({
        where: { organizationId },
        select: { defaultDatabaseConnectionId: true },
      }),
      this.prisma.databaseConnection.findMany({
        where: { organizationId },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.databaseType,
      host: row.host,
      database: row.databaseName,
      isActive: row.isActive,
      isDefault: settings?.defaultDatabaseConnectionId === row.id,
      lastTestStatus: row.isActive ? "Ready" : "Inactive",
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async resetWorkspaceSettings(user: AuthUserPayload) {
    await this.prisma.workspaceSettings.deleteMany({
      where: { organizationId: user.organizationId },
    });
    return this.getSettings(user);
  }

  async resetUserSettings(user: AuthUserPayload) {
    await this.prisma.userSettings.deleteMany({
      where: { userId: user.userId },
    });
    return this.getSettings(user);
  }
}
