import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  TreatmentPlan as PrismaPlan,
  TreatmentSession as PrismaSession,
} from '@prisma/client';
import type {
  TreatmentPlan,
  TreatmentSession,
  CreateTreatmentPlanInput,
  UpdateTreatmentPlanInput,
  RegisterSessionInput,
} from '@evolua/contracts';

function planToDTO(p: PrismaPlan): TreatmentPlan {
  return {
    id: p.id,
    clinicId: p.clinicId,
    patientId: p.patientId,
    therapistId: p.therapistId,
    title: p.title,
    diagnosis: p.diagnosis,
    objectives: p.objectives,
    totalSessions: p.totalSessions,
    usedSessions: p.usedSessions,
    status: p.status,
    insuranceName: p.insuranceName,
    authorizationCode: p.authorizationCode,
    authorizationExpiry: p.authorizationExpiry?.toISOString().slice(0, 10) ?? null,
    startDate: p.startDate.toISOString().slice(0, 10),
    expectedEndDate: p.expectedEndDate?.toISOString().slice(0, 10) ?? null,
    completedAt: p.completedAt?.toISOString() ?? null,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function sessionToDTO(s: PrismaSession): TreatmentSession {
  return {
    id: s.id,
    treatmentPlanId: s.treatmentPlanId,
    appointmentId: s.appointmentId,
    sessionNumber: s.sessionNumber,
    conductedAt: s.conductedAt.toISOString(),
    evolution: s.evolution,
    goalProgress: s.goalProgress ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export class TreatmentPlansService {
  async list(clinicId: string, patientId?: string) {
    const rows = await prisma.treatmentPlan.findMany({
      where: { clinicId, deletedAt: null, ...(patientId && { patientId }) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(planToDTO);
  }

  async findById(clinicId: string, id: string) {
    const row = await prisma.treatmentPlan.findFirst({
      where: { id, clinicId, deletedAt: null },
    });
    return row ? planToDTO(row) : null;
  }

  async create(clinicId: string, input: CreateTreatmentPlanInput) {
    const [patient, therapist] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: input.patientId, clinicId, deletedAt: null },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { id: input.therapistId, clinicId },
        select: { id: true },
      }),
    ]);
    if (!patient || !therapist) return null;
    const row = await prisma.treatmentPlan.create({
      data: {
        clinicId,
        patientId: input.patientId,
        therapistId: input.therapistId,
        title: input.title,
        diagnosis: input.diagnosis ?? null,
        objectives: input.objectives,
        totalSessions: input.totalSessions,
        insuranceName: input.insuranceName ?? null,
        authorizationCode: input.authorizationCode ?? null,
        authorizationExpiry: input.authorizationExpiry
          ? new Date(input.authorizationExpiry)
          : null,
        startDate: new Date(input.startDate),
        expectedEndDate: input.expectedEndDate ? new Date(input.expectedEndDate) : null,
        notes: input.notes ?? null,
      },
    });
    return planToDTO(row);
  }

  async update(clinicId: string, id: string, input: UpdateTreatmentPlanInput) {
    const exists = await prisma.treatmentPlan.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.treatmentPlan.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.diagnosis !== undefined && { diagnosis: input.diagnosis }),
        ...(input.objectives !== undefined && { objectives: input.objectives }),
        ...(input.totalSessions !== undefined && { totalSessions: input.totalSessions }),
        ...(input.status !== undefined && {
          status: input.status,
          completedAt: input.status === 'completed' ? new Date() : null,
        }),
        ...(input.insuranceName !== undefined && { insuranceName: input.insuranceName }),
        ...(input.authorizationCode !== undefined && { authorizationCode: input.authorizationCode }),
        ...(input.authorizationExpiry !== undefined && {
          authorizationExpiry: input.authorizationExpiry
            ? new Date(input.authorizationExpiry)
            : null,
        }),
        ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
        ...(input.expectedEndDate !== undefined && {
          expectedEndDate: input.expectedEndDate ? new Date(input.expectedEndDate) : null,
        }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
    return planToDTO(row);
  }

  async remove(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.treatmentPlan.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return false;
    await prisma.treatmentPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }

  // ── Sessions ────────────────────────────────────────────────────────────
  async listSessions(clinicId: string, planId: string) {
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: planId, clinicId },
      select: { id: true },
    });
    if (!plan) return null;
    const rows = await prisma.treatmentSession.findMany({
      where: { treatmentPlanId: planId },
      orderBy: { sessionNumber: 'asc' },
    });
    return rows.map(sessionToDTO);
  }

  async registerSession(
    clinicId: string,
    planId: string,
    input: RegisterSessionInput,
  ): Promise<TreatmentSession | null> {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.treatmentPlan.findFirst({
        where: { id: planId, clinicId, deletedAt: null },
      });
      if (!plan) return null;

      const sessionNumber = plan.usedSessions + 1;

      const session = await tx.treatmentSession.create({
        data: {
          treatmentPlanId: planId,
          appointmentId: input.appointmentId ?? null,
          sessionNumber,
          conductedAt: new Date(input.conductedAt),
          evolution: input.evolution ?? null,
          goalProgress: (input.goalProgress as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      await tx.treatmentPlan.update({
        where: { id: planId },
        data: {
          usedSessions: sessionNumber,
          ...(sessionNumber >= plan.totalSessions && {
            status: 'completed',
            completedAt: new Date(),
          }),
        },
      });

      return sessionToDTO(session);
    });
  }
}

export const treatmentPlansService = new TreatmentPlansService();
