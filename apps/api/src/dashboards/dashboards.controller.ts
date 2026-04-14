import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DashboardsService } from "./dashboards.service";
import { CreateDashboardDto } from "./dto/create-dashboard.dto";
import { CreateDashboardCardDto } from "./dto/create-dashboard-card.dto";
import { UpdateDashboardLayoutDto } from "./dto/update-dashboard-layout.dto";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("dashboards")
@UseGuards(AuthGuard("jwt"))
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Get()
  list(@CurrentUser() user: AuthUserPayload) {
    return this.dashboards.list(user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateDashboardDto) {
    return this.dashboards.create(user.organizationId, dto);
  }

  @Patch(":id/layout")
  updateLayout(
    @Param("id") id: string,
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateDashboardLayoutDto,
  ) {
    return this.dashboards.updateLayout(id, user.organizationId, dto.items);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @CurrentUser() user: AuthUserPayload) {
    return this.dashboards.getById(id, user.organizationId);
  }

  @Post(":id/cards")
  addCard(
    @Param("id") id: string,
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateDashboardCardDto,
  ) {
    return this.dashboards.addCard(id, user.organizationId, user.userId, dto);
  }
}
