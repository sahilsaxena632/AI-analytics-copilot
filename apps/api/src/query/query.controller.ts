import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { QueryService } from "./query.service";
import { QueryRunsService } from "./query-runs.service";
import { AskQuestionDto } from "./dto/ask-question.dto";
import { ExecuteQueryDto } from "./dto/execute-query.dto";
import { CurrentUser, type AuthUserPayload } from "../common/decorators/current-user.decorator";

@Controller("query")
@UseGuards(AuthGuard("jwt"))
export class QueryController {
  constructor(
    private readonly query: QueryService,
    private readonly queryRuns: QueryRunsService,
  ) {}

  @Post("ask")
  ask(@CurrentUser() user: AuthUserPayload, @Body() dto: AskQuestionDto) {
    return this.query.askQuestion(user.organizationId, dto.connectionId, dto.question);
  }

  @Post("execute")
  execute(@CurrentUser() user: AuthUserPayload, @Body() dto: ExecuteQueryDto) {
    return this.query.execute(
      user.organizationId,
      user.userId,
      dto.connectionId,
      dto.sql,
      dto.savedQueryId,
      dto.naturalLanguageQuestion,
    );
  }

  @Get("runs")
  runs(
    @CurrentUser() user: AuthUserPayload,
    @Query("connectionId") connectionId?: string,
  ) {
    return this.queryRuns.list(user.organizationId, connectionId);
  }
}
