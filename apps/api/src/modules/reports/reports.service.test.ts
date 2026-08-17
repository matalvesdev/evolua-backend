import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateReportInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  report: { create: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { ReportsService } = await import('./reports.service.js');

const reportInput: CreateReportInput = {
  patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
  patientName: 'Paciente de teste',
  therapistName: 'Profissional de teste',
  therapistCrfa: '',
  type: 'evolution',
  title: 'Evolução',
  content: '',
};

beforeEach(() => {
  vi.clearAllMocks();
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
