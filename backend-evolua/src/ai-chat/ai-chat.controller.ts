import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import type { ChatResponse } from './ai-chat.service';
import { AiChatDto } from './dto';

@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async chat(@Body() dto: AiChatDto): Promise<ChatResponse> {
    return this.aiChatService.chat(dto.question, dto.history);
  }
}
