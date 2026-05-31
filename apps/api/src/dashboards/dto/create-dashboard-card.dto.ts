import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class CreateDashboardCardDto {
  @IsPrismaClientId()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsIn(["bar", "line", "table"])
  chartType!: "bar" | "line" | "table";

  @IsString()
  @IsNotEmpty()
  @MaxLength(65536)
  sqlText!: string;
}
