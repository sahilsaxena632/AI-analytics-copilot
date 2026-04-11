import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class CreateSavedQueryDto {
  @IsPrismaClientId()
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
