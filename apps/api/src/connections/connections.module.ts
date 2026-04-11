import { Module } from "@nestjs/common";
import { ConnectionsService } from "./connections.service";
import { ConnectionsController } from "./connections.controller";
import { DatabaseConnectionsController } from "./database-connections.controller";
import { DatabaseConnectionsService } from "./database-connections.service";
import { ConnectionSchemaExplorerService } from "./connection-schema-explorer.service";

@Module({
  controllers: [ConnectionsController, DatabaseConnectionsController],
  providers: [ConnectionsService, DatabaseConnectionsService, ConnectionSchemaExplorerService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
