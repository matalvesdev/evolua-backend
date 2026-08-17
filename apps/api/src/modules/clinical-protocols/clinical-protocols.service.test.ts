import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateProtocolEntryInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  clinicalProtocolTemplate: { findUnique: vi.fn() },
  treatmentPlan: { findFirst: vi.fn() },
  appointment: { findFirst: vi.fn() },
  clinicalProtocolEntry: { create: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { ClinicalProtocolsService } = await import('./clinical-protocols.service.js');

beforeEach(() => vi.clearAllMocks());

describe('ClinicalProtocolsService tenant integrity', () => {
  it('rejects a cross-tenant treatment plan before persisting the clinical entry', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce({ id: 'patient-a' });
    prismaMock.clinicalProtocolTemplate.findUnique.mockResolvedValueOnce({ id: 'template-a' });
    prismaMock.treatmentPlan.findFirst.mockResolvedValueOnce(null);
    prismaMock.appointment.findFirst.mockResolvedValueOnce({ id: 'appointment-a' });
    const input: CreateProtocolEntryInput = {
      patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
      templateId: '3bd63fcd-ae0e-4ee4-8c2d-8f71d141ef16',
      treatmentPlanId: '0dbd2cae-50d4-46a4-89cd-ced5d50917c8',
      appointmentId: 'a10cc5fb-1a87-4597-82b0-945692332b54',
      values: { score: 4 },
      conductedAt: '2026-08-17T12:00:00.000Z',
    };

    await expect(new ClinicalProtocolsService().createEntry('clinic-a', 'therapist-a', input)).resolves.toBeNull();
    expect(prismaMock.clinicalProtocolEntry.create).not.toHaveBeenCalled();
    expect(prismaMock.treatmentPlan.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ clinicId: 'clinic-a', patientId: input.patientId }),
      select: { id: true },
    });
  });
});
