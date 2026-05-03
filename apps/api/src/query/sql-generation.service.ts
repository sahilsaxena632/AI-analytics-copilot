import { Injectable, Logger } from "@nestjs/common";
import type { GenerateSqlResponseDto } from "@analytics-copilot/shared";
import { ConnectionAdapterResolver } from "../database/connection-adapter.resolver";
import type { GenerateSqlDto } from "./dto/generate-sql.dto";
import { groupColumns, narrowWorkingTables, suggestTables } from "./sql-generation/sql-generation-context.util";
import { SqlGenerationOrchestratorService } from "./sql-generation/sql-generation-orchestrator.service";

@Injectable()
export class SqlGenerationService {
  private readonly logger = new Logger(SqlGenerationService.name);

  constructor(
    private readonly adapterResolver: ConnectionAdapterResolver,
    private readonly orchestrator: SqlGenerationOrchestratorService,
  ) {}

  async generate(organizationId: string, dto: GenerateSqlDto): Promise<GenerateSqlResponseDto> {
    const adapter = await this.adapterResolver.resolveActive(dto.databaseConnectionId, organizationId);
    const dialect = adapter.dialect;
    const flat = await adapter.getSchema();
    const tables = groupColumns(flat);
    if (tables.length === 0) {
      return {
        status: "needs_clarification",
        generatedSql: null,
        explanation:
          "This connection has no visible user tables (or metadata could not be read). Check permissions or add tables, then try again.",
        needsClarification: true,
        clarificationQuestion: "Does this database role have permission to read information_schema (or SHOW TABLES on MySQL)?",
        providerUsed: "none",
      };
    }

    const narrow = narrowWorkingTables(tables, dto);
    if (narrow.error) {
      return narrow.error;
    }
    const working = narrow.working;

    const userNarrowed =
      Boolean(dto.selectedTables?.filter((s) => s && String(s).trim()).length) || Boolean(dto.selectedTable?.trim());

    const selectedForLog = dto.selectedTables?.filter((s) => s && String(s).trim()).slice(0, 16) ?? [];
    this.logger.log(
      `SQL gen request: connection=${dto.databaseConnectionId} dialect=${dialect} narrowed=${userNarrowed} selectedTables=${userNarrowed ? selectedForLog.join(",") : "(none)"} workingCount=${working.length}`,
    );

    const res = await this.orchestrator.generateWithLlm({
      databaseConnectionId: dto.databaseConnectionId,
      dialect,
      question: dto.question,
      schemaContext: dto.schemaContext,
      workingTables: working,
      suggestedTables: suggestTables(tables),
      userNarrowedTables: userNarrowed,
    });

    if (res.status === "ok" && userNarrowed && working.length > 1) {
      const scope = working.map((t) => `${t.tableSchema}.${t.tableName}`).join(", ");
      return {
        ...res,
        explanation: `${res.explanation} Context tables: ${scope}.`,
      };
    }

    return res;
  }
}
