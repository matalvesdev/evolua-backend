import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecordScaleResultInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  clinicalScale: { findUnique: vi.fn() },
  appointment: { findFirst: vi.fn() },
  clinicalScaleResult: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { ClinicalScalesService } = await import('./clinical-scales.service.js');

beforeEach(() => vi.clearAllMocks());

describe('ClinicalScalesService tenant isolation', () => {
  it('does not record a scale result for a patient outside the clinic', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);
    const service = new ClinicalScalesService();
    const input: RecordScaleResultInput = {
      patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
      scaleId: '3bd63fcd-ae0e-4ee4-8c2d-8f71d141ef16',
      score: { value: 2 },
    };

    await expect(service.recordResult('clinic-a', 'therapist-a', input)).resolves.toBeNull();
    expect(prismaMock.clinicalScaleResult.create).not.toHaveBeenCalled();
  });

  it('does not record a result with an appointment from another clinic or patient', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce({ id: 'patient-a' });
    prismaMock.clinicalScale.findUnique.mockResolvedValueOnce({ id: 'scale-a' });
    prismaMock.appointment.findFirst.mockResolvedValueOnce(null);
    const service = new ClinicalScalesService();
    const input: RecordScaleResultInput = {
      patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
      scaleId: '3bd63fcd-ae0e-4ee4-8c2d-8f71d141ef16',
      appointmentId: '0dbd2cae-50d4-46a4-89cd-ced5d50917c8',
      score: { value: 2 },
    };

    await expect(service.recordResult('clinic-a', 'therapist-a', input)).resolves.toBeNull();
    expect(prismaMock.clinicalScaleResult.create).not.toHaveBeenCalled();
  });
});
