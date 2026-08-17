import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateAppointmentInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  user: { findFirst: vi.fn(), findUnique: vi.fn() },
  appointment: { create: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { AppointmentsService } = await import('./appointments.service.js');

const appointmentInput: CreateAppointmentInput = {
  patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
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

    await expect(service.create('clinic-a', 'therapist-a', appointmentInput)).rejects.toMatchObject({
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

  it('deriva a profissional pelo usuário autenticado e valida o tenant', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce({ id: appointmentInput.patientId, name: 'Paciente real' });
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'therapist-a', fullName: 'Profissional real' });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'therapist-a', clinicId: 'clinic-a', role: 'therapist' });
    prismaMock.appointment.create.mockResolvedValueOnce({
      id: 'appointment-a', clinicId: 'clinic-a', patientId: appointmentInput.patientId,
      patientName: 'Paciente real', therapistId: 'therapist-a', therapistName: 'Profissional real',
      dateTime: new Date(appointmentInput.dateTime), duration: 60, type: 'session', status: 'scheduled',
      notes: null, sessionNotes: null, cancellationReason: null, cancellationNotes: null, cancelledBy: null,
      cancelledAt: null, confirmedAt: null, startedAt: null, completedAt: null, googleCalendarEventId: null,
      reminder24hSentAt: null, reminder1hSentAt: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    const service = new AppointmentsService();

    await service.create('clinic-a', 'therapist-a', appointmentInput);

    expect(prismaMock.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        patientName: 'Paciente real', therapistId: 'therapist-a', therapistName: 'Profissional real',
      }),
    }));
  });
});
