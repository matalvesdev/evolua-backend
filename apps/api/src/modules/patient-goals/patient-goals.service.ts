import { prisma } from '../../lib/prisma.js';
import type {
  PatientGoal as PrismaGoal,
  GoalProgressSnapshot as PrismaSnapshot,
  GoalMilestone as PrismaMilestone,
} from '@prisma/client';
import type {
  PatientGoal,
  GoalSnapshot,
  GoalMilestone,
  CreateGoalInput,
  UpdateGoalInput,
  RegisterSnapshotInput,
  CreateMilestoneInput,
} from '@evolua/contracts';

function goalToDTO(g: PrismaGoal): PatientGoal {
  return {
    id: g.id,
    clinicId: g.clinicId,
    patientId: g.patientId,
    therapistId: g.therapistId,
    title: g.title,
    description: g.description,
    status: g.status,
    priority: g.priority,
    startDate: g.startDate.toISOString(),
    targetDate: g.targetDate?.toISOString() ?? null,
    completedAt: g.completedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

function snapshotToDTO(s: PrismaSnapshot): GoalSnapshot {
  return {
    id: s.id,
    goalId: s.goalId,
    therapistId: s.therapistId,
    progress: s.progress,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
  };
}

function milestoneToDTO(m: PrismaMilestone): GoalMilestone {
  return {
    id: m.id,
    goalId: m.goalId,
    title: m.title,
    description: m.description,
    dueDate: m.dueDate.toISOString().slice(0, 10),
    completed: m.completed,
    completedAt: m.completedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

export class PatientGoalsService {
  async list(clinicId: string, patientId?: string) {
    const rows = await prisma.patientGoal.findMany({
      where: { clinicId, ...(patientId && { patientId }) },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(goalToDTO);
  }

  async findById(clinicId: string, id: string) {
    const row = await prisma.patientGoal.findFirst({ where: { id, clinicId } });
    return row ? goalToDTO(row) : null;
  }

  async create(clinicId: string, therapistId: string, input: CreateGoalInput) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) return null;
    const row = await prisma.patientGoal.create({
      data: {
        clinicId,
        therapistId,
        patientId: input.patientId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        startDate: new Date(input.startDate),
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
      },
    });
    return goalToDTO(row);
  }

  async update(clinicId: string, id: string, input: UpdateGoalInput) {
    const exists = await prisma.patientGoal.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.patientGoal.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.status !== undefined && {
          status: input.status,
          completedAt: input.status === 'achieved' ? new Date() : null,
        }),
        ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
        ...(input.targetDate !== undefined && {
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
        }),
      },
    });
    return goalToDTO(row);
  }

  async remove(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.patientGoal.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!exists) return false;
    await prisma.patientGoal.delete({ where: { id } });
    return true;
  }

  // ── Snapshots ───────────────────────────────────────────────────────────
  async listSnapshots(clinicId: string, goalId: string) {
    const goal = await prisma.patientGoal.findFirst({
      where: { id: goalId, clinicId },
      select: { id: true },
    });
    if (!goal) return null;
    const rows = await prisma.goalProgressSnapshot.findMany({
      where: { goalId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(snapshotToDTO);
  }

  async registerSnapshot(
    clinicId: string,
    goalId: string,
    therapistId: string,
    input: RegisterSnapshotInput,
  ) {
    const goal = await prisma.patientGoal.findFirst({
      where: { id: goalId, clinicId },
      select: { id: true },
    });
    if (!goal) return null;
    const row = await prisma.goalProgressSnapshot.create({
      data: {
        goalId,
        therapistId,
        progress: input.progress,
        notes: input.notes ?? null,
      },
    });
    return snapshotToDTO(row);
  }

  // ── Milestones ──────────────────────────────────────────────────────────
  async listMilestones(clinicId: string, goalId: string) {
    const goal = await prisma.patientGoal.findFirst({
      where: { id: goalId, clinicId },
      select: { id: true },
    });
    if (!goal) return null;
    const rows = await prisma.goalMilestone.findMany({
      where: { goalId },
      orderBy: { dueDate: 'asc' },
    });
    return rows.map(milestoneToDTO);
  }

  async createMilestone(clinicId: string, goalId: string, input: CreateMilestoneInput) {
    const goal = await prisma.patientGoal.findFirst({
      where: { id: goalId, clinicId },
      select: { id: true },
    });
    if (!goal) return null;
    const row = await prisma.goalMilestone.create({
      data: {
        goalId,
        title: input.title,
        description: input.description ?? null,
        dueDate: new Date(input.dueDate),
      },
    });
    return milestoneToDTO(row);
  }

  async toggleMilestone(clinicId: string, milestoneId: string) {
    const m = await prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goal: { clinicId } },
    });
    if (!m) return null;
    const row = await prisma.goalMilestone.update({
      where: { id: milestoneId },
      data: {
        completed: !m.completed,
        completedAt: !m.completed ? new Date() : null,
      },
    });
    return milestoneToDTO(row);
  }

  async deleteMilestone(clinicId: string, milestoneId: string): Promise<boolean> {
    const m = await prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goal: { clinicId } },
      select: { id: true },
    });
    if (!m) return false;
    await prisma.goalMilestone.delete({ where: { id: milestoneId } });
    return true;
  }
}

export const patientGoalsService = new PatientGoalsService();
