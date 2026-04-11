import { IsBoolean, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateConnectionDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsNotEmpty()
  connectionString!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
