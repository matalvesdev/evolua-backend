import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class AiChatDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @IsOptional()
  history?: { role: 'user' | 'assistant'; content: string }[];
}
