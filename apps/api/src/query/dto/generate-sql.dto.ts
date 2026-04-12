import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, IsNotEmpty } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class GenerateSqlDto {
  @IsPrismaClientId()
  databaseConnectionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;

  /**
   * Optional qualified tables (`schema.table` or single identifier per entry).
   * When non-empty, generation only considers these tables. Empty or omitted = full schema.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @MaxLength(260, { each: true })
  selectedTables?: string[];

  /** @deprecated Prefer `selectedTables`. If `selectedTables` is absent or empty, this still narrows to one table. */
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
