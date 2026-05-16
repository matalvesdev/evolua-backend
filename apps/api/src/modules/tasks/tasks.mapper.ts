import type { Task as PrismaTask } from '@prisma/client';
import type { Task } from '@evolua/contracts';

export function taskToDTO(t: PrismaTask): Task {
  return {
    id: t.id,
    clinicId: t.clinicId,
    userId: t.userId,
    title: t.title,
    description: t.description,
    type: t.type,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    patientId: t.patientId,
    appointmentId: t.appointmentId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
