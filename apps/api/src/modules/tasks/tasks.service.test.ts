import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateTaskInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  appointment: { findFirst: vi.fn() },
  task: { create: vi.fn() },
};
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
const { TasksService } = await import('./tasks.service.js');

beforeEach(() => vi.clearAllMocks());

describe('TasksService reference integrity', () => {
  it('rejects an appointment outside the clinic before creating a task', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce({ id: 'patient-a' });
    prismaMock.appointment.findFirst.mockResolvedValueOnce(null);
    const input: CreateTaskInput = {
      title: 'Retornar responsável', type: 'follow_up', priority: 'medium',
      patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
      appointmentId: '3bd63fcd-ae0e-4ee4-8c2d-8f71d141ef16',
    };
    await expect(new TasksService().create('clinic-a', 'user-a', input)).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });
});
