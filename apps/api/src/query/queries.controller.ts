import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SqlGenerationService } from "./sql-generation.service";
import { QueryExecutionService } from "./query-execution.service";
import { GenerateSqlDto } from "./dto/generate-sql.dto";
import { QueriesExecuteDto } from "./dto/queries-execute.dto";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("queries")
@UseGuards(AuthGuard("jwt"))
export class QueriesController {
  constructor(
    private readonly sqlGeneration: SqlGenerationService,
    private readonly queryExecution: QueryExecutionService,
  ) {}

  @Post("generate-sql")
  generateSql(@CurrentUser() user: AuthUserPayload, @Body() dto: GenerateSqlDto) {
    return this.sqlGeneration.generate(user.organizationId, dto);
  }

  @Post("execute")
  execute(@CurrentUser() user: AuthUserPayload, @Body() dto: QueriesExecuteDto) {
    return this.queryExecution.execute(
      user.organizationId,
      user.userId,
      dto.databaseConnectionId,
      dto.sql,
      dto.savedQueryId,
    );
  }
}
