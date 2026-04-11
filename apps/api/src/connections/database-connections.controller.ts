import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConnectionSchemaExplorerService } from "./connection-schema-explorer.service";
import { DatabaseConnectionsService } from "./database-connections.service";
import { CreateDatabaseConnectionDto } from "./dto/create-database-connection.dto";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("database-connections")
@UseGuards(AuthGuard("jwt"))
export class DatabaseConnectionsController {
  constructor(
    private readonly databaseConnections: DatabaseConnectionsService,
    private readonly schemaExplorer: ConnectionSchemaExplorerService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUserPayload) {
    return this.databaseConnections.list(user.organizationId);
  }

  @Get(":id/schema/:tableName/preview")
  async previewTable(
    @Param("id") id: string,
    @Param("tableName") tableName: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.schemaExplorer.getTablePreview(id, user.organizationId, tableName);
  }

  @Get(":id/schema")
  async getSchema(@Param("id") id: string, @CurrentUser() user: AuthUserPayload) {
    return this.schemaExplorer.getLiveSchema(id, user.organizationId);
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @CurrentUser() user: AuthUserPayload) {
    return this.databaseConnections.getById(id, user.organizationId);
  }

  @Post(":id/test")
  async testSaved(@Param("id") id: string, @CurrentUser() user: AuthUserPayload) {
    return this.databaseConnections.testSaved(id, user.organizationId);
  }

  @Post()
  async create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateDatabaseConnectionDto) {
    return this.databaseConnections.create(user.organizationId, user.userId, dto);
  }
}
