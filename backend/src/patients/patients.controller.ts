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
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreatePatientDto, UpdatePatientDto, SearchPatientsDto, ChangeStatusDto } from './dto';

@ApiTags('Pacientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar paciente' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(user.clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pacientes' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SearchPatientsDto) {
    return this.patientsService.findAll(user.clinicId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar paciente por ID' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patientsService.findOne(id, user.clinicId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar paciente' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, user.clinicId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status do paciente' })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.patientsService.changeStatus(id, user.clinicId, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover paciente' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patientsService.remove(id, user.clinicId);
  }
}
