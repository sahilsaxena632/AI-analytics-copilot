import { Module } from "@nestjs/common";
import { QueryService } from "./query.service";
import { QueryController } from "./query.controller";
import { QueriesController } from "./queries.controller";
import { SqlGenerationService } from "./sql-generation.service";
import { QueryExecutionService } from "./query-execution.service";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [ConnectionsModule],
  controllers: [QueryController, QueriesController],
  providers: [QueryService, SqlGenerationService, QueryExecutionService],
  exports: [QueryService, SqlGenerationService, QueryExecutionService],
})
export class QueryModule {}
