import { IsIn, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateDashboardCardDto {
  @IsUUID()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsIn(["bar", "line", "table"])
  chartType!: "bar" | "line" | "table";

  @IsString()
  @IsNotEmpty()
  sqlText!: string;
}
