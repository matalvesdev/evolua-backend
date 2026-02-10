import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto, ListMessagesDto } from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Message, Prisma } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    clinicId: string,
    therapistId: string,
    patientId: string,
    dto: CreateMessageDto,
  ): Promise<Message> {
    return this.prisma.message.create({
      data: {
        clinicId,
        therapistId,
        patientId,
        content: dto.content,
        templateType: dto.templateType,
        recipientPhone: dto.recipientPhone,
        recipientName: dto.recipientName,
        channel: dto.channel || 'whatsapp',
      },
    });
  }

  async findByPatient(
    clinicId: string,
    patientId: string,
    query: ListMessagesDto,
  ): Promise<PaginatedResponseDto<Message>> {
    const where: Prisma.MessageWhereInput = { clinicId, patientId };
    if (query.type) {
      where.templateType = query.type;
    }

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.message.count({ where }),
    ]);

    return new PaginatedResponseDto(messages, total, query.page ?? 1, query.limit ?? 20);
  }
}
