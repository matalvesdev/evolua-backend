import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePatientGoalDto,
  UpdatePatientGoalDto,
  CreateGoalProgressSnapshotDto,
  CreateGoalMilestoneDto,
  SearchPatientGoalsDto,
  CompleteMilestoneDto,
  CompleteGoalDto,
} from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PatientGoal, GoalProgressSnapshot, GoalMilestone, Prisma } from '@prisma/client';

@Injectable()
export class PatientGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar uma nova meta terapêutica
   */
  async createGoal(
    clinicId: string,
    therapistId: string,
    dto: CreatePatientGoalDto,
  ): Promise<PatientGoal> {
    // Validar que o paciente pertence à clínica
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado ou não pertence à sua clínica');
    }

    return this.prisma.patientGoal.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        therapistId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'medium',
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        startDate: new Date(),
      },
      include: {
        snapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
        milestones: { orderBy: { dueDate: 'asc' } },
      },
    });
  }

  /**
   * Listar metas de um paciente ou todas as metas da clínica
   */
  async findAll(
    clinicId: string,
    query: SearchPatientGoalsDto,
  ): Promise<PaginatedResponseDto<PatientGoal>> {
    const where: Prisma.PatientGoalWhereInput = { clinicId };

    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [goals, total] = await this.prisma.$transaction([
      this.prisma.patientGoal.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true } },
          therapist: { select: { id: true, fullName: true } },
          snapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
          milestones: { orderBy: { dueDate: 'asc' } },
        },
      }),
      this.prisma.patientGoal.count({ where }),
    ]);

    return new PaginatedResponseDto(goals, total, query.page ?? 1, query.limit ?? 20);
  }

  /**
   * Buscar uma meta específica
   */
  async findOne(id: string, clinicId: string): Promise<PatientGoal & {
    snapshots: GoalProgressSnapshot[];
    milestones: GoalMilestone[];
  }> {
    const goal = await this.prisma.patientGoal.findFirst({
      where: { id, clinicId },
      include: {
        patient: { select: { id: true, name: true } },
        therapist: { select: { id: true, fullName: true } },
        snapshots: { orderBy: { createdAt: 'desc' } },
        milestones: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    return goal;
  }

  /**
   * Atualizar uma meta
   */
  async updateGoal(
    id: string,
    clinicId: string,
    dto: UpdatePatientGoalDto,
  ): Promise<PatientGoal> {
    await this.findOne(id, clinicId);

    return this.prisma.patientGoal.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.targetDate && { targetDate: new Date(dto.targetDate) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
      },
      include: {
        snapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
        milestones: { orderBy: { dueDate: 'asc' } },
      },
    });
  }

  /**
   * Deletar uma meta
   */
  async deleteGoal(id: string, clinicId: string): Promise<void> {
    await this.findOne(id, clinicId);

    await this.prisma.patientGoal.delete({ where: { id } });
  }

  /**
   * Adicionar um snapshot de progresso
   */
  async addProgressSnapshot(
    goalId: string,
    clinicId: string,
    therapistId: string,
    dto: CreateGoalProgressSnapshotDto,
  ): Promise<GoalProgressSnapshot> {
    // Validar que a meta pertence à clínica
    const goal = await this.findOne(goalId, clinicId);

    if (dto.progress < 0 || dto.progress > 100) {
      throw new BadRequestException('Progresso deve estar entre 0 e 100');
    }

    return this.prisma.goalProgressSnapshot.create({
      data: {
        goalId,
        therapistId,
        progress: dto.progress,
        notes: dto.notes,
      },
    });
  }

  /**
   * Buscar histórico de progresso de uma meta
   */
  async getProgressHistory(
    goalId: string,
    clinicId: string,
  ): Promise<GoalProgressSnapshot[]> {
    await this.findOne(goalId, clinicId);

    return this.prisma.goalProgressSnapshot.findMany({
      where: { goalId },
      orderBy: { createdAt: 'desc' },
      include: {
        therapist: { select: { id: true, fullName: true } },
      },
    });
  }

  /**
   * Criar um milestone para uma meta
   */
  async createMilestone(
    goalId: string,
    clinicId: string,
    dto: CreateGoalMilestoneDto,
  ): Promise<GoalMilestone> {
    // Validar que a meta pertence à clínica
    await this.findOne(goalId, clinicId);

    return this.prisma.goalMilestone.create({
      data: {
        goalId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  /**
   * Listar milestones de uma meta
   */
  async getMilestones(goalId: string, clinicId: string): Promise<GoalMilestone[]> {
    await this.findOne(goalId, clinicId);

    return this.prisma.goalMilestone.findMany({
      where: { goalId },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Marcar um milestone como concluído
   */
  async completeMilestone(
    goalId: string,
    clinicId: string,
    milestoneId: string,
  ): Promise<GoalMilestone> {
    await this.findOne(goalId, clinicId);

    const milestone = await this.prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goalId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone não encontrado');
    }

    return this.prisma.goalMilestone.update({
      where: { id: milestoneId },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Deletar um milestone
   */
  async deleteMilestone(goalId: string, clinicId: string, milestoneId: string): Promise<void> {
    await this.findOne(goalId, clinicId);

    const milestone = await this.prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goalId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone não encontrado');
    }

    await this.prisma.goalMilestone.delete({ where: { id: milestoneId } });
  }

  /**
   * Completar uma meta
   */
  async completeGoal(
    id: string,
    clinicId: string,
    dto: CompleteGoalDto,
  ): Promise<PatientGoal> {
    await this.findOne(id, clinicId);

    return this.prisma.patientGoal.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
      include: {
        snapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
        milestones: { orderBy: { dueDate: 'asc' } },
      },
    });
  }

  /**
   * Calcular estatísticas de uma meta
   */
  async getGoalStats(goalId: string, clinicId: string): Promise<{
    totalSnapshots: number;
    currentProgress: number;
    averageProgress: number;
    completedMilestones: number;
    totalMilestones: number;
    daysElapsed: number;
    daysRemaining: number;
  }> {
    const goal = await this.findOne(goalId, clinicId);

    const snapshots = await this.prisma.goalProgressSnapshot.findMany({
      where: { goalId },
      orderBy: { createdAt: 'asc' },
    });

    const milestones = await this.prisma.goalMilestone.findMany({
      where: { goalId },
    });

    const currentProgress = snapshots.length > 0 ? snapshots[snapshots.length - 1].progress : 0;
    const averageProgress =
      snapshots.length > 0 ? snapshots.reduce((a, b) => a + b.progress, 0) / snapshots.length : 0;
    const completedMilestones = milestones.filter((m) => m.completed).length;

    const now = new Date();
    const daysElapsed = Math.floor(
      (now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = goal.targetDate
      ? Math.floor((goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      totalSnapshots: snapshots.length,
      currentProgress: Math.min(currentProgress, 100),
      averageProgress: Math.min(averageProgress, 100),
      completedMilestones,
      totalMilestones: milestones.length,
      daysElapsed: Math.max(daysElapsed, 0),
      daysRemaining: Math.max(daysRemaining, 0),
    };
  }
}
