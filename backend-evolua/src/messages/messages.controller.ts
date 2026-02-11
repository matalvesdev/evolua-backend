import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreateMessageDto, ListMessagesDto } from './dto';

@ApiTags('Mensagens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients/:patientId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar mensagem enviada' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(user.clinicId, user.id, patientId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mensagens do paciente' })
  findByPatient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.messagesService.findByPatient(user.clinicId, patientId, query);
  }
}
