import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SchemaService } from "./schema.service";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("schema")
@UseGuards(AuthGuard("jwt"))
export class SchemaController {
  constructor(private readonly schema: SchemaService) {}

  @Post("connections/:connectionId/refresh")
  refresh(@Param("connectionId") connectionId: string, @CurrentUser() user: AuthUserPayload) {
    return this.schema.refresh(connectionId, user.organizationId, user.userId);
  }

  @Get("connections/:connectionId/latest")
  latest(@Param("connectionId") connectionId: string, @CurrentUser() user: AuthUserPayload) {
    return this.schema.latest(connectionId, user.organizationId);
  }
}
