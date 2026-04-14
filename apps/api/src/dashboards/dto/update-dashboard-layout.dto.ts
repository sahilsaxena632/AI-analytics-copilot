import { Type } from "class-transformer";
import { IsArray, IsInt, Max, Min, ValidateNested } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class DashboardLayoutItemDto {
  @IsPrismaClientId()
  id!: string;

  @IsInt()
  @Min(0)
  x!: number;

  @IsInt()
  @Min(0)
  @Max(2000)
  y!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  w!: number;

  @IsInt()
  @Min(1)
  @Max(40)
  h!: number;
}

export class UpdateDashboardLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardLayoutItemDto)
  items!: DashboardLayoutItemDto[];
}
