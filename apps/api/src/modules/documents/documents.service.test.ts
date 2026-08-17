import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  user: { findFirst: vi.fn() },
  report: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { DocumentsService } = await import('./documents.service.js');

beforeEach(() => vi.clearAllMocks());

describe('DocumentsService tenant isolation', () => {
  it('rejects a document for a patient outside the clinic', async () => {
    prismaMock.patient.findFirst.mockResolvedValue(null);
    const service = new DocumentsService();

    await expect(
      service.create('clinic-a', 'therapist-a', {
        patientId: 'patient-b',
        patientName: 'Nome controlado pelo cliente',
        type: 'document',
        title: 'Documento',
      }),
    ).rejects.toThrow('Patient not found in this clinic');
    expect(prismaMock.report.create).not.toHaveBeenCalled();
  });

  it('derives patient name from the authorized patient record', async () => {
    prismaMock.patient.findFirst.mockResolvedValue({ id: 'patient-a', name: 'Paciente Real' });
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'therapist-a', fullName: 'Profissional Autenticada', crfa: 'CRFa 1-12345',
    });
    prismaMock.report.create.mockResolvedValue({
      id: 'document-a', patientId: 'patient-a', patientName: 'Paciente Real',
      type: 'document', title: 'Documento', content: '', status: 'draft',
      createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const service = new DocumentsService();

    await service.create('clinic-a', 'therapist-a', {
      patientId: 'patient-a', patientName: 'Nome falso', type: 'document', title: 'Documento',
    });

    expect(prismaMock.report.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        patientId: 'patient-a',
        patientName: 'Paciente Real',
        therapistName: 'Profissional Autenticada',
        therapistCrfa: 'CRFa 1-12345',
      }),
    }));
  });

  it('rejects a therapist outside the clinic before persisting a document', async () => {
    prismaMock.patient.findFirst.mockResolvedValue({ id: 'patient-a', name: 'Paciente Real' });
    prismaMock.user.findFirst.mockResolvedValue(null);
    const service = new DocumentsService();

    await expect(service.create('clinic-a', 'therapist-b', {
      patientId: 'patient-a', patientName: 'Paciente Real', type: 'document', title: 'Documento',
    })).rejects.toThrow('Therapist not found in this clinic');
    expect(prismaMock.report.create).not.toHaveBeenCalled();
  });
});
