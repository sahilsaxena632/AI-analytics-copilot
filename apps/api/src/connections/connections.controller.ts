import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConnectionsService } from "./connections.service";
import { CreateConnectionDto } from "./dto/create-connection.dto";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("connections")
@UseGuards(AuthGuard("jwt"))
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUserPayload) {
    return this.connections.list(user.organizationId);
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @CurrentUser() user: AuthUserPayload) {
    const c = await this.connections.getById(id, user.organizationId);
    return {
      id: c.id,
      name: c.name,
      type: c.databaseType,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateConnectionDto) {
    return this.connections.create(user.organizationId, user.userId, dto);
  }
}
