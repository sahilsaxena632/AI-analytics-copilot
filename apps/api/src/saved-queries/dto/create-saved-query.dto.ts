import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSavedQueryDto {
  @IsUUID()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  sqlText!: string;

  @IsOptional()
  @IsString()
  naturalLanguageQuestion?: string;
}
