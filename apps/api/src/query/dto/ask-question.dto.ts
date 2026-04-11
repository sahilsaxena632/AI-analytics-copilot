import { IsNotEmpty, IsString } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class AskQuestionDto {
  @IsPrismaClientId()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;
}
