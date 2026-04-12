import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { IsOptionalPrismaClientId, IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class ExecuteQueryDto {
  @IsPrismaClientId()
  connectionId!: string;

  @IsOptionalPrismaClientId()
  savedQueryId?: string;

  @IsString()
  @IsNotEmpty()
  sql!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  naturalLanguageQuestion?: string;
}
