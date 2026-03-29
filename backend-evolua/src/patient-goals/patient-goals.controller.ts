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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PatientGoalsService } from './patient-goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreatePatientGoalDto,
  UpdatePatientGoalDto,
  CreateGoalProgressSnapshotDto,
  CreateGoalMilestoneDto,
  SearchPatientGoalsDto,
  CompleteMilestoneDto,
  CompleteGoalDto,
} from './dto';

@ApiTags('Metas do Paciente')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patient-goals')
export class PatientGoalsController {
  constructor(private readonly goalsService: PatientGoalsService) {}

  /**
   * Criar uma nova meta terapêutica
   */
  @Post()
  @ApiOperation({ summary: 'Criar uma nova meta terapêutica' })
  @ApiResponse({ status: 201, description: 'Meta criada com sucesso' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientGoalDto) {
    return this.goalsService.createGoal(user.clinicId, user.id, dto);
  }

  /**
   * Listar metas com filtros
   */
  @Get()
  @ApiOperation({ summary: 'Listar metas com filtros e paginação' })
  @ApiResponse({ status: 200, description: 'Lista de metas' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SearchPatientGoalsDto) {
    return this.goalsService.findAll(user.clinicId, query);
  }

  /**
   * Buscar uma meta específica
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma meta por ID' })
  @ApiResponse({ status: 200, description: 'Meta encontrada' })
  @ApiResponse({ status: 404, description: 'Meta não encontrada' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.findOne(id, user.clinicId);
  }

  /**
   * Atualizar uma meta
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma meta' })
  @ApiResponse({ status: 200, description: 'Meta atualizada' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientGoalDto,
  ) {
    return this.goalsService.updateGoal(id, user.clinicId, dto);
  }

  /**
   * Deletar uma meta
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar uma meta' })
  @ApiResponse({ status: 204, description: 'Meta deletada' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.deleteGoal(id, user.clinicId);
  }

  /**
   * Completar uma meta
   */
  @Patch(':id/complete')
  @ApiOperation({ summary: 'Marcar uma meta como completa' })
  @ApiResponse({ status: 200, description: 'Meta marcada como completa' })
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CompleteGoalDto,
  ) {
    return this.goalsService.completeGoal(id, user.clinicId, dto);
  }

  /**
   * Adicionar um snapshot de progresso
   */
  @Post(':id/progress')
  @ApiOperation({ summary: 'Adicionar um snapshot de progresso' })
  @ApiResponse({ status: 201, description: 'Snapshot de progresso adicionado' })
  addProgress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateGoalProgressSnapshotDto,
  ) {
    return this.goalsService.addProgressSnapshot(id, user.clinicId, user.id, dto);
  }

  /**
   * Buscar histórico de progresso
   */
  @Get(':id/progress')
  @ApiOperation({ summary: 'Buscar histórico de progresso de uma meta' })
  @ApiResponse({ status: 200, description: 'Histórico de progresso' })
  progressHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.getProgressHistory(id, user.clinicId);
  }

  /**
   * Buscar estatísticas de uma meta
   */
  @Get(':id/stats')
  @ApiOperation({ summary: 'Buscar estatísticas de uma meta' })
  @ApiResponse({ status: 200, description: 'Estatísticas da meta' })
  stats(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.getGoalStats(id, user.clinicId);
  }

  /**
   * Criar um milestone
   */
  @Post(':id/milestones')
  @ApiOperation({ summary: 'Criar um milestone para uma meta' })
  @ApiResponse({ status: 201, description: 'Milestone criado' })
  createMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateGoalMilestoneDto,
  ) {
    return this.goalsService.createMilestone(id, user.clinicId, dto);
  }

  /**
   * Listar milestones
   */
  @Get(':id/milestones')
  @ApiOperation({ summary: 'Listar milestones de uma meta' })
  @ApiResponse({ status: 200, description: 'Lista de milestones' })
  getMilestones(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.getMilestones(id, user.clinicId);
  }

  /**
   * Completar um milestone
   */
  @Patch(':id/milestones/:milestoneId/complete')
  @ApiOperation({ summary: 'Marcar um milestone como completo' })
  @ApiResponse({ status: 200, description: 'Milestone marcado como completo' })
  completeMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.goalsService.completeMilestone(id, user.clinicId, milestoneId);
  }

  /**
   * Deletar um milestone
   */
  @Delete(':id/milestones/:milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um milestone' })
  @ApiResponse({ status: 204, description: 'Milestone deletado' })
  deleteMilestone(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.goalsService.deleteMilestone(id, user.clinicId, milestoneId);
  }
}
