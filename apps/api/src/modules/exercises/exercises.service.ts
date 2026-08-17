import { prisma } from '../../lib/prisma.js';
import type {
  ExerciseTemplate as PrismaExercise,
  PatientExercisePrescription as PrismaPrescription,
} from '@prisma/client';
import type {
  ExerciseTemplate,
  PatientExercisePrescription,
  CreateExerciseInput,
  UpdateExerciseInput,
  PrescribeExerciseInput,
} from '@evolua/contracts';

function exerciseToDTO(e: PrismaExercise): ExerciseTemplate {
  return {
    id: e.id,
    name: e.name,
    area: e.area,
    subarea: e.subarea,
    description: e.description,
    instructions: e.instructions,
    duration: e.duration,
    frequency: e.frequency,
    repetitions: e.repetitions,
    videoUrl: e.videoUrl,
    imageUrl: e.imageUrl,
    tags: e.tags,
    difficulty: e.difficulty,
    ageGroup: e.ageGroup,
    isSystem: e.isSystem,
    clinicId: e.clinicId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function prescriptionToDTO(p: PrismaPrescription): PatientExercisePrescription {
  return {
    id: p.id,
    clinicId: p.clinicId,
    patientId: p.patientId,
    therapistId: p.therapistId,
    exerciseId: p.exerciseId,
    treatmentPlanId: p.treatmentPlanId,
    customInstructions: p.customInstructions,
    frequency: p.frequency,
    repetitions: p.repetitions,
    durationDays: p.durationDays,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate?.toISOString().slice(0, 10) ?? null,
    status: p.status,
    sentAt: p.sentAt?.toISOString() ?? null,
    sentVia: p.sentVia,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export class ExercisesService {
  async list(clinicId: string, area?: string, subarea?: string) {
    const rows = await prisma.exerciseTemplate.findMany({
      where: {
        OR: [{ isSystem: true }, { clinicId }],
        ...(area && { area }),
        ...(subarea && { subarea }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(exerciseToDTO);
  }

  async findById(clinicId: string, id: string) {
    const row = await prisma.exerciseTemplate.findFirst({
      where: { id, OR: [{ isSystem: true }, { clinicId }] },
    });
    return row ? exerciseToDTO(row) : null;
  }

  async create(clinicId: string, input: CreateExerciseInput) {
    const row = await prisma.exerciseTemplate.create({
      data: {
        clinicId,
        isSystem: false,
        name: input.name,
        area: input.area,
        subarea: input.subarea ?? null,
        description: input.description,
        instructions: input.instructions,
        duration: input.duration ?? null,
        frequency: input.frequency ?? null,
        repetitions: input.repetitions ?? null,
        videoUrl: input.videoUrl ?? null,
        imageUrl: input.imageUrl ?? null,
        tags: input.tags,
        difficulty: input.difficulty,
        ageGroup: input.ageGroup,
      },
    });
    return exerciseToDTO(row);
  }

  async update(clinicId: string, id: string, input: UpdateExerciseInput) {
    const exists = await prisma.exerciseTemplate.findFirst({
      where: { id, clinicId, isSystem: false },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.exerciseTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.area !== undefined && { area: input.area }),
        ...(input.subarea !== undefined && { subarea: input.subarea }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.instructions !== undefined && { instructions: input.instructions }),
        ...(input.duration !== undefined && { duration: input.duration }),
        ...(input.frequency !== undefined && { frequency: input.frequency }),
        ...(input.repetitions !== undefined && { repetitions: input.repetitions }),
        ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
        ...(input.ageGroup !== undefined && { ageGroup: input.ageGroup }),
      },
    });
    return exerciseToDTO(row);
  }

  async remove(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.exerciseTemplate.findFirst({
      where: { id, clinicId, isSystem: false },
      select: { id: true },
    });
    if (!exists) return false;
    await prisma.exerciseTemplate.delete({ where: { id } });
    return true;
  }

  // ── Prescriptions ───────────────────────────────────────────────────────
  async listPrescriptions(clinicId: string, patientId?: string) {
    const rows = await prisma.patientExercisePrescription.findMany({
      where: { clinicId, ...(patientId && { patientId }) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(prescriptionToDTO);
  }

  async prescribe(
    clinicId: string,
    therapistId: string,
    input: PrescribeExerciseInput,
  ): Promise<PatientExercisePrescription | null> {
    const [patient, exercise] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: input.patientId, clinicId, deletedAt: null },
        select: { id: true },
      }),
      prisma.exerciseTemplate.findFirst({
        where: { id: input.exerciseId, OR: [{ isSystem: true }, { clinicId }] },
        select: { id: true },
      }),
    ]);
    if (!patient || !exercise) return null;

    if (input.treatmentPlanId) {
      const plan = await prisma.treatmentPlan.findFirst({
        where: {
          id: input.treatmentPlanId,
          clinicId,
          patientId: input.patientId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!plan) return null;
    }

    const row = await prisma.patientExercisePrescription.create({
      data: {
        clinicId,
        therapistId,
        patientId: input.patientId,
        exerciseId: input.exerciseId,
        treatmentPlanId: input.treatmentPlanId ?? null,
        customInstructions: input.customInstructions ?? null,
        frequency: input.frequency,
        repetitions: input.repetitions ?? null,
        durationDays: input.durationDays ?? null,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });
    return prescriptionToDTO(row);
  }

  async cancelPrescription(clinicId: string, id: string) {
    const exists = await prisma.patientExercisePrescription.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.patientExercisePrescription.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return prescriptionToDTO(row);
  }
}

export const exercisesService = new ExercisesService();
