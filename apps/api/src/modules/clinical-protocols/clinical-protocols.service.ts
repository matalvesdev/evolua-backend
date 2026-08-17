import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  ClinicalProtocolTemplate as PrismaTemplate,
  ClinicalProtocolEntry as PrismaEntry,
} from '@prisma/client';
import type {
  ClinicalProtocolTemplate,
  ClinicalProtocolEntry,
  CreateProtocolEntryInput,
} from '@evolua/contracts';

function templateToDTO(t: PrismaTemplate): ClinicalProtocolTemplate {
  return {
    id: t.id,
    name: t.name,
    area: t.area,
    description: t.description,
    version: t.version,
    fields: t.fields,
    isSystem: t.isSystem,
    createdAt: t.createdAt.toISOString(),
  };
}

function entryToDTO(e: PrismaEntry): ClinicalProtocolEntry {
  return {
    id: e.id,
    clinicId: e.clinicId,
    patientId: e.patientId,
    therapistId: e.therapistId,
    treatmentPlanId: e.treatmentPlanId,
    appointmentId: e.appointmentId,
    templateId: e.templateId,
    values: e.values,
    totalScore: e.totalScore,
    interpretation: e.interpretation,
    conductedAt: e.conductedAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

export class ClinicalProtocolsService {
  async listTemplates(area?: string) {
    const rows = await prisma.clinicalProtocolTemplate.findMany({
      where: { ...(area && { area }) },
      orderBy: { name: 'asc' },
    });
    return rows.map(templateToDTO);
  }

  async findTemplate(id: string) {
    const row = await prisma.clinicalProtocolTemplate.findUnique({ where: { id } });
    return row ? templateToDTO(row) : null;
  }

  async listEntries(clinicId: string, patientId?: string, templateId?: string) {
    const rows = await prisma.clinicalProtocolEntry.findMany({
      where: {
        clinicId,
        ...(patientId && { patientId }),
        ...(templateId && { templateId }),
      },
      orderBy: { conductedAt: 'desc' },
    });
    return rows.map(entryToDTO);
  }

  async createEntry(
    clinicId: string,
    therapistId: string,
    input: CreateProtocolEntryInput,
  ) {
    // These references are independent foreign keys in PostgreSQL. Validate
    // their shared tenant and patient scope explicitly before creating a
    // sensitive clinical entry.
    const [patient, template, treatmentPlan, appointment] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: input.patientId, clinicId, deletedAt: null },
        select: { id: true },
      }),
      prisma.clinicalProtocolTemplate.findUnique({
        where: { id: input.templateId },
        select: { id: true },
      }),
      input.treatmentPlanId
        ? prisma.treatmentPlan.findFirst({
          where: {
            id: input.treatmentPlanId,
            clinicId,
            patientId: input.patientId,
            deletedAt: null,
          },
          select: { id: true },
        })
        : Promise.resolve(null),
      input.appointmentId
        ? prisma.appointment.findFirst({
          where: {
            id: input.appointmentId,
            clinicId,
            patientId: input.patientId,
            deletedAt: null,
          },
          select: { id: true },
        })
        : Promise.resolve(null),
    ]);

    if (!patient || !template || (input.treatmentPlanId && !treatmentPlan) || (input.appointmentId && !appointment)) {
      return null;
    }

    const row = await prisma.clinicalProtocolEntry.create({
      data: {
        clinicId,
        therapistId,
        patientId: input.patientId,
        templateId: input.templateId,
        treatmentPlanId: input.treatmentPlanId ?? null,
        appointmentId: input.appointmentId ?? null,
        values: input.values as Prisma.InputJsonValue,
        totalScore: input.totalScore ?? null,
        interpretation: input.interpretation ?? null,
        conductedAt: new Date(input.conductedAt),
      },
    });
    return entryToDTO(row);
  }

  async deleteEntry(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.clinicalProtocolEntry.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!exists) return false;
    await prisma.clinicalProtocolEntry.delete({ where: { id } });
    return true;
  }
}

export const clinicalProtocolsService = new ClinicalProtocolsService();
