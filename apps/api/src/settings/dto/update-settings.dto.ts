import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsIn(["light", "dark", "system"])
  theme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @IsOptional()
  @IsIn(["comfortable", "compact"])
  density?: string;
}

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  anomalyAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  scheduledReports?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardRefresh?: boolean;

  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;
}

export class DashboardDefaultsDto {
  @IsOptional()
  @IsIn(["balanced", "compact", "spacious"])
  defaultLayout?: string;

  @IsOptional()
  @IsIn(["manual", "5m", "15m", "1h"])
  refreshInterval?: string;
}

export class UpdateWorkspaceSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  organizationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsPrismaClientId()
  defaultDatabaseConnectionId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(10000)
  defaultQueryRowLimit?: number;

  @IsOptional()
  @IsIn(["selected_tables", "full_schema"])
  defaultSchemaContextMode?: string;

  @IsOptional()
  @IsBoolean()
  showSqlByDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  showExplanationByDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  autoRunGeneratedSql?: boolean;

  @IsOptional()
  @IsBoolean()
  autoChart?: boolean;

  @IsOptional()
  @IsIn(["auto", "bar", "line", "area", "pie", "table", "kpi"])
  defaultChartType?: string;

  @IsOptional()
  @IsBoolean()
  kpiFirst?: boolean;

  @IsOptional()
  @IsBoolean()
  chartCollapsedByDefault?: boolean;

  @IsOptional()
  @IsIn(["comfortable", "compact"])
  chartDensity?: string;

  @IsOptional()
  @IsIn(["automatic", "ask_when_unsure"])
  clarificationMode?: string;

  @IsOptional()
  @IsBoolean()
  lowConfidenceWarning?: boolean;

  @IsOptional()
  @IsIn(["automatic", "groq", "gemini"])
  preferredLlmProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredLlmModel?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardDefaultsDto)
  dashboardDefaults?: DashboardDefaultsDto;

  @IsOptional()
  @IsObject()
  future?: Record<string, unknown>;
}

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserSettingsDto)
  user?: UpdateUserSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateWorkspaceSettingsDto)
  workspace?: UpdateWorkspaceSettingsDto;
}
