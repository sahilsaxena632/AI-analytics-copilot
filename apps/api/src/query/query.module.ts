import { Module } from "@nestjs/common";
import { QueryService } from "./query.service";
import { QueryController } from "./query.controller";
import { QueriesController } from "./queries.controller";
import { QueryRunsController } from "./query-runs.controller";
import { QueryRunsService } from "./query-runs.service";
import { SqlGenerationService } from "./sql-generation.service";
import { QueryExecutionService } from "./query-execution.service";
import { ConnectionsModule } from "../connections/connections.module";
import { SqlGenerationOrchestratorService } from "./sql-generation/sql-generation-orchestrator.service";
import { GeminiSqlGenerationProvider } from "./sql-generation/gemini-sql-generation.provider";
import { GroqSqlGenerationProvider } from "./sql-generation/groq-sql-generation.provider";

@Module({
  imports: [ConnectionsModule],
  controllers: [QueryController, QueriesController, QueryRunsController],
  providers: [
    QueryService,
    QueryRunsService,
    SqlGenerationService,
    SqlGenerationOrchestratorService,
    GeminiSqlGenerationProvider,
    GroqSqlGenerationProvider,
    QueryExecutionService,
  ],
  exports: [QueryService, QueryRunsService, SqlGenerationService, QueryExecutionService],
})
export class QueryModule {}
