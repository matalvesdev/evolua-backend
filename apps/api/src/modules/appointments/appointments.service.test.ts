import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateAppointmentInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  appointment: { create: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { AppointmentsService } = await import('./appointments.service.js');

const appointmentInput: CreateAppointmentInput = {
  patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
  patientName: 'Paciente de teste',
  therapistName: 'Profissional de teste',
  dateTime: '2026-08-14T12:00:00.000Z',
  duration: 60,
  type: 'session',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AppointmentsService tenant isolation', () => {
  it('recusa agendamento para paciente que não pertence à clínica autenticada', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);
    const service = new AppointmentsService();

    await expect(service.create('clinic-a', appointmentInput)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(prismaMock.patient.findFirst).toHaveBeenCalledWith({
      where: {
        id: appointmentInput.patientId,
        clinicId: 'clinic-a',
        deletedAt: null,
      },
      select: { id: true, name: true },
    });
    expect(prismaMock.appointment.create).not.toHaveBeenCalled();
  });
});
