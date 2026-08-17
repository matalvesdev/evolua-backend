import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  Task,
} from '@evolua/contracts';
import { taskToDTO } from './tasks.mapper.js';

export class TasksService {
  async list(clinicId: string, q: ListTasksQuery) {
    const where: Prisma.TaskWhereInput = {
      clinicId,
      ...(q.status && { status: q.status }),
      ...(q.priority && { priority: q.priority }),
      ...(q.type && { type: q.type }),
      ...(q.patientId && { patientId: q.patientId }),
      ...(q.userId && { userId: q.userId }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.task.count({ where }),
    ]);
    return {
      data: rows.map(taskToDTO),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }

  async findById(clinicId: string, id: string): Promise<Task | null> {
    const row = await prisma.task.findFirst({ where: { id, clinicId } });
    return row ? taskToDTO(row) : null;
  }

  async create(clinicId: string, userId: string, input: CreateTaskInput): Promise<Task> {
    const references = await this.resolveReferences(clinicId, input.patientId, input.appointmentId);
    const row = await prisma.task.create({
      data: {
        clinicId,
        userId,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        patientId: references.patientId,
        appointmentId: references.appointmentId,
      },
    });
    return taskToDTO(row);
  }

  async update(
    clinicId: string,
    id: string,
    input: UpdateTaskInput,
  ): Promise<Task | null> {
    const exists = await prisma.task.findFirst({ where: { id, clinicId }, select: { id: true, patientId: true, appointmentId: true } });
    if (!exists) return null;
    const references = await this.resolveReferences(
      clinicId,
      input.patientId === undefined ? exists.patientId : input.patientId,
      input.appointmentId === undefined ? exists.appointmentId : input.appointmentId,
    );
    const row = await prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.status !== undefined && {
          status: input.status,
          completedAt: input.status === 'completed' ? new Date() : null,
        }),
        ...(input.dueDate !== undefined && {
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        }),
        ...(input.patientId !== undefined || input.appointmentId !== undefined ? references : {}),
      },
    });
    return taskToDTO(row);
  }

  async complete(clinicId: string, id: string): Promise<Task | null> {
    return this.update(clinicId, id, { status: 'completed' });
  }

  async remove(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.task.findFirst({ where: { id, clinicId }, select: { id: true } });
    if (!exists) return false;
    await prisma.task.delete({ where: { id } });
    return true;
  }

  private async resolveReferences(clinicId: string, patientId?: string | null, appointmentId?: string | null) {
    const [patient, appointment] = await Promise.all([
      patientId ? prisma.patient.findFirst({ where: { id: patientId, clinicId, deletedAt: null }, select: { id: true } }) : Promise.resolve(null),
      appointmentId ? prisma.appointment.findFirst({ where: { id: appointmentId, clinicId, deletedAt: null }, select: { id: true, patientId: true } }) : Promise.resolve(null),
    ]);
    if ((patientId && !patient) || (appointmentId && !appointment) || (patient && appointment && patient.id !== appointment.patientId)) {
      throw Object.assign(new Error('Patient and appointment must belong to the same clinic'), { statusCode: 404 });
    }
    return { patientId: patient?.id ?? appointment?.patientId ?? null, appointmentId: appointment?.id ?? null };
  }
}

export const tasksService = new TasksService();
