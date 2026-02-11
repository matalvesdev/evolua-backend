import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, SearchTasksDto } from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Task, Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, userId: string, dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        clinicId,
        userId,
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'task',
        priority: dto.priority ?? 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
      },
    });
  }

  async findAll(clinicId: string, userId: string, query: SearchTasksDto): Promise<PaginatedResponseDto<Task>> {
    const where: Prisma.TaskWhereInput = { clinicId, userId };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.patientId) where.patientId = query.patientId;

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: { patient: { select: { id: true, name: true } } },
      }),
      this.prisma.task.count({ where }),
    ]);

    return new PaginatedResponseDto(tasks, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOne(id: string, clinicId: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({ where: { id, clinicId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    return task;
  }

  async update(id: string, clinicId: string, dto: UpdateTaskDto): Promise<Task> {
    await this.findOne(id, clinicId);
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.completed !== undefined && {
          completedAt: dto.completed ? new Date() : null,
          status: dto.completed ? 'completed' : 'pending',
        }),
      },
    });
  }

  async remove(id: string, clinicId: string): Promise<void> {
    await this.findOne(id, clinicId);
    await this.prisma.task.delete({ where: { id } });
  }
}
