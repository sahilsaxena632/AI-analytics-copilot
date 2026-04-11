import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class GenerateSqlDto {
  @IsPrismaClientId()
  databaseConnectionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;

  /** Optional qualified table: `schema.table` or single identifier. */
  @IsOptional()
  @IsString()
  @MaxLength(260)
  selectedTable?: string;

  /** Optional free-text hints merged into the generator input (e.g. column names). */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  schemaContext?: string;
}
