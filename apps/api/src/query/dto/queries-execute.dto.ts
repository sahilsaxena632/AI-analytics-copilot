import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { IsOptionalPrismaClientId, IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class QueriesExecuteDto {
  @IsPrismaClientId()
  databaseConnectionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65536)
  sql!: string;

  @IsOptionalPrismaClientId()
  savedQueryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  naturalLanguageQuestion?: string;
}
