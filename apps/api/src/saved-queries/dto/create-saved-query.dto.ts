import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class CreateSavedQueryDto {
  @IsPrismaClientId()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  sqlText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  generatedSqlText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  naturalLanguageQuestion?: string;
}
