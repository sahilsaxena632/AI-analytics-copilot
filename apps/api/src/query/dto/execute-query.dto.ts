import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class ExecuteQueryDto {
  @IsUUID()
  connectionId!: string;

  @IsOptional()
  @IsUUID()
  savedQueryId?: string;

  @IsString()
  @IsNotEmpty()
  sql!: string;
}
