import { IsNotEmpty, IsString } from "class-validator";
import { IsOptionalPrismaClientId, IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class QueriesExecuteDto {
  @IsPrismaClientId()
  databaseConnectionId!: string;

  @IsString()
  @IsNotEmpty()
  sql!: string;

  @IsOptionalPrismaClientId()
  savedQueryId?: string;
}
