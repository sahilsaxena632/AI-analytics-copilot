import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SavedQueriesService } from "./saved-queries.service";
import { CreateSavedQueryDto } from "./dto/create-saved-query.dto";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("saved-queries")
@UseGuards(AuthGuard("jwt"))
export class SavedQueriesController {
  constructor(private readonly savedQueries: SavedQueriesService) {}

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateSavedQueryDto) {
    return this.savedQueries.create(user.organizationId, user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUserPayload) {
    return this.savedQueries.list(user.organizationId);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @CurrentUser() user: AuthUserPayload) {
    return this.savedQueries.getById(id, user.organizationId);
  }
}
