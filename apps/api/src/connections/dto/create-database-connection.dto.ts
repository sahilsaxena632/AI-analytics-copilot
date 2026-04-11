import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateDatabaseConnectionDto {
  /** External analytics engine; extend enum + factory when adding providers. */
  @IsIn(["postgres", "mysql"])
  type!: "postgres" | "mysql";

  /** When true, validates credentials and runs a test query only — nothing is persisted. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(253)
  @Matches(/^[^\s]+$/, { message: "Host must not contain whitespace" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  host!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65_535)
  port!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(63)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  database!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  password!: string;

  @IsOptional()
  @IsBoolean()
  ssl?: boolean;
}
