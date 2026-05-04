import { Body, Controller, Delete, Get, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto, UpdateUserSettingsDto, UpdateWorkspaceSettingsDto } from "./dto/update-settings.dto";

@Controller("settings")
@UseGuards(AuthGuard("jwt"))
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: AuthUserPayload) {
    return this.settings.getSettings(user);
  }

  @Put()
  updateSettings(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateSettingsDto) {
    return this.settings.updateSettings(user, dto);
  }

  @Get("user")
  getUserSettings(@CurrentUser() user: AuthUserPayload) {
    return this.settings.getUserSettings(user);
  }

  @Put("user")
  updateUserSettings(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateUserSettingsDto) {
    return this.settings.updateUserSettings(user, dto);
  }

  @Get("workspace")
  getWorkspaceSettings(@CurrentUser() user: AuthUserPayload) {
    return this.settings.getWorkspaceSettings(user);
  }

  @Put("workspace")
  updateWorkspaceSettings(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateWorkspaceSettingsDto) {
    return this.settings.updateWorkspaceSettings(user, dto);
  }

  @Get("databases")
  getDatabases(@CurrentUser() user: AuthUserPayload) {
    return this.settings.getDatabases(user.organizationId);
  }

  @Delete("user")
  resetUserSettings(@CurrentUser() user: AuthUserPayload) {
    return this.settings.resetUserSettings(user);
  }

  @Delete("workspace")
  resetWorkspaceSettings(@CurrentUser() user: AuthUserPayload) {
    return this.settings.resetWorkspaceSettings(user);
  }
}
