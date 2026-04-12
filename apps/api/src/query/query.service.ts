import { Injectable } from "@nestjs/common";
import type { AskQuestionResponseDto, GenerateSqlResponseDto, QueryExecuteResultDto } from "@analytics-copilot/shared";
import { SqlGenerationService } from "./sql-generation.service";
import { QueryExecutionService } from "./query-execution.service";

@Injectable()
export class QueryService {
  constructor(
    private readonly sqlGeneration: SqlGenerationService,
    private readonly queryExecution: QueryExecutionService,
  ) {}

  /** @deprecated Prefer POST /queries/generate-sql — kept for older clients. */
  async askQuestion(organizationId: string, connectionId: string, question: string): Promise<AskQuestionResponseDto> {
    const res = await this.sqlGeneration.generate(organizationId, {
      databaseConnectionId: connectionId,
      question,
    });
    return mapGenerateToAsk(res);
  }

  async execute(
    organizationId: string,
    userId: string,
    connectionId: string,
    sql: string,
    savedQueryId?: string | null,
    naturalLanguageQuestion?: string | null,
  ): Promise<QueryExecuteResultDto> {
    return this.queryExecution.execute(
      organizationId,
      userId,
      connectionId,
      sql,
      savedQueryId,
      naturalLanguageQuestion,
    );
  }
}

function mapGenerateToAsk(res: GenerateSqlResponseDto): AskQuestionResponseDto {
  if (res.status === "needs_clarification" || !res.generatedSql) {
    return {
      generatedSql: "",
      explanation: res.explanation,
    };
  }
  return {
    generatedSql: res.generatedSql,
    explanation: res.explanation,
  };
}
