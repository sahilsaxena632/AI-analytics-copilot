import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { QueryRunsService } from "./query-runs.service";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("query-runs")
@UseGuards(AuthGuard("jwt"))
export class QueryRunsController {
  constructor(private readonly queryRuns: QueryRunsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query("connectionId") connectionId?: string,
  ) {
    return this.queryRuns.list(user.organizationId, connectionId);
  }
}
