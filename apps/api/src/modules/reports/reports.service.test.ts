import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateReportInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  user: { findFirst: vi.fn() },
  report: { create: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { ReportsService } = await import('./reports.service.js');

const reportInput: CreateReportInput = {
  patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
  type: 'evolution',
  title: 'Evolução',
  content: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

it('deriva a autoria do profissional autenticado, e não do corpo da requisição', async () => {
  prismaMock.patient.findFirst.mockResolvedValueOnce({ id: reportInput.patientId, name: 'Paciente real' });
  prismaMock.user.findFirst.mockResolvedValueOnce({
    fullName: 'Profissional autenticada',
    crfa: 'CRFa 1-12345',
  });
  prismaMock.report.create.mockResolvedValueOnce({
    id: 'report-1', clinicId: 'clinic-a', patientId: reportInput.patientId,
    patientName: 'Paciente real', therapistId: 'therapist-a', therapistName: 'Profissional autenticada',
    therapistCrfa: 'CRFa 1-12345', type: 'evolution', status: 'draft', title: 'Evolução', content: '',
    sections: null, transcription: null, periodStartDate: null, periodEndDate: null, appointmentId: null,
    reviewedBy: null, reviewedAt: null, reviewNotes: null, approvedBy: null, approvedAt: null,
    sentAt: null, sentTo: [], signedAt: null, signedBy: null, createdAt: new Date(), updatedAt: new Date(),
  });

  const service = new ReportsService();
  await service.create('clinic-a', 'therapist-a', reportInput);

  expect(prismaMock.report.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      patientName: 'Paciente real', therapistName: 'Profissional autenticada', therapistCrfa: 'CRFa 1-12345',
    }),
  }));
});

it('recusa autoria quando o usuário autenticado não pertence à clínica', async () => {
  prismaMock.patient.findFirst.mockResolvedValueOnce({ id: reportInput.patientId, name: 'Paciente real' });
  prismaMock.user.findFirst.mockResolvedValueOnce(null);
  const service = new ReportsService();

  await expect(service.create('clinic-a', 'therapist-a', reportInput)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(prismaMock.report.create).not.toHaveBeenCalled();
});

describe('ReportsService tenant isolation', () => {
  it('recusa relatório para paciente que não pertence à clínica autenticada', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);
    const service = new ReportsService();

    await expect(service.create('clinic-a', 'therapist-a', reportInput)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(prismaMock.patient.findFirst).toHaveBeenCalledWith({
      where: {
        id: reportInput.patientId,
        clinicId: 'clinic-a',
        deletedAt: null,
      },
      select: { id: true, name: true },
    });
    expect(prismaMock.report.create).not.toHaveBeenCalled();
  });
});

describe('ReportsService delivery integrity', () => {
  it('recusa marcar um relatório como enviado sem transporte seguro configurado', async () => {
    const service = new ReportsService();

    await expect(service.send('clinic-a', 'report-a', { recipients: ['patient@example.com'] }))
      .rejects.toMatchObject({ statusCode: 501 });
  });
});
