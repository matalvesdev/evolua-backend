import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrescribeExerciseInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  exerciseTemplate: { findFirst: vi.fn() },
  treatmentPlan: { findFirst: vi.fn() },
  patientExercisePrescription: { create: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { ExercisesService } = await import('./exercises.service.js');

beforeEach(() => vi.clearAllMocks());

describe('ExercisesService tenant isolation', () => {
  it('does not prescribe an exercise to a patient outside the clinic', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);
    prismaMock.exerciseTemplate.findFirst.mockResolvedValueOnce({ id: 'exercise-a' });
    const service = new ExercisesService();
    const input: PrescribeExerciseInput = {
      patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
      exerciseId: '3bd63fcd-ae0e-4ee4-8c2d-8f71d141ef16',
      frequency: 'Diariamente',
      startDate: '2026-08-17',
    };

    await expect(service.prescribe('clinic-a', 'therapist-a', input)).resolves.toBeNull();
    expect(prismaMock.patientExercisePrescription.create).not.toHaveBeenCalled();
  });
});
