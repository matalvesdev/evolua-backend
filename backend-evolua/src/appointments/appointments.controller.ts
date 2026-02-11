import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreateAppointmentDto, UpdateAppointmentDto, CancelAppointmentDto, SearchAppointmentsDto } from './dto';

@ApiTags('Agendamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar agendamento' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar agendamentos' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SearchAppointmentsDto) {
    return this.appointmentsService.findAll(user.clinicId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, user.clinicId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar agendamento' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, user.clinicId, dto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmar agendamento' })
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.confirm(id, user.clinicId);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Iniciar sessão' })
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.start(id, user.clinicId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Concluir sessão' })
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('sessionNotes') sessionNotes?: string) {
    return this.appointmentsService.complete(id, user.clinicId, sessionNotes);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar agendamento' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelAppointmentDto) {
    return this.appointmentsService.cancel(id, user.clinicId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover agendamento' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.remove(id, user.clinicId);
  }
}
