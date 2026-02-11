import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

const TEMPLATE_TYPES = ['reminder', 'activity', 'feedback', 'free'] as const;

export class CreateMessageDto {
  @ApiProperty({ description: 'Conteúdo da mensagem' })
  @IsString()
  content: string;

  @ApiProperty({ enum: TEMPLATE_TYPES, description: 'Tipo de template utilizado' })
  @IsIn(TEMPLATE_TYPES)
  templateType: string;

  @ApiProperty({ description: 'Telefone do destinatário' })
  @IsString()
  recipientPhone: string;

  @ApiProperty({ description: 'Nome do destinatário' })
  @IsString()
  recipientName: string;

  @ApiPropertyOptional({ default: 'whatsapp', description: 'Canal de envio' })
  @IsOptional()
  @IsString()
  channel?: string = 'whatsapp';
}

export class ListMessagesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TEMPLATE_TYPES, description: 'Filtrar por tipo de template' })
  @IsOptional()
  @IsIn(TEMPLATE_TYPES)
  type?: string;
}
