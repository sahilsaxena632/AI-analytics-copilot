import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { IsPrismaClientId } from "../../common/validators/is-prisma-client-id.decorator";

export class AskQuestionDto {
  @IsPrismaClientId()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question!: string;
}
