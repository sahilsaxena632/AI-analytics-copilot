import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AskQuestionDto {
  @IsUUID()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;
}
