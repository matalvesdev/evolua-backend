import { prisma } from '../../lib/prisma.js';
import type {
  ClinicalScale,
  ClinicalScaleResult,
  RecordScaleResultInput,
} from '@evolua/contracts';

export class ClinicalScalesService {
  async listScales() {
    const rows = await prisma.clinicalScale.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(scaleToDTO);
  }

  async findScaleById(id: string): Promise<ClinicalScale | null> {
    const row = await prisma.clinicalScale.findUnique({ where: { id } });
    return row ? scaleToDTO(row) : null;
  }

  async listResults(clinicId: string, patientId: string, scaleId?: string) {
    const patient = await this.assertPatientBelongsToClinic(clinicId, patientId);
    if (!patient) return null;
    const where: { patientId: string; scaleId?: string } = { patientId };
    if (scaleId) where.scaleId = scaleId;
    const rows = await prisma.clinicalScaleResult.findMany({
      where,
      orderBy: { conductedAt: 'desc' },
    });
    return rows.map(resultToDTO);
  }

  async recordResult(
    clinicId: string,
    therapistId: string,
    input: RecordScaleResultInput,
  ): Promise<ClinicalScaleResult | null> {
    const [patient, scale, appointment] = await Promise.all([
      this.assertPatientBelongsToClinic(clinicId, input.patientId),
      prisma.clinicalScale.findUnique({
        where: { id: input.scaleId },
        select: { id: true },
      }),
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
    if (!patient || !scale || (input.appointmentId && !appointment)) return null;
    const row = await prisma.clinicalScaleResult.create({
      data: {
        patientId: input.patientId,
        scaleId: input.scaleId,
        therapistId,
        appointmentId: input.appointmentId ?? null,
        score: (input.score ?? {}) as object,
        notes: input.notes ?? null,
        conductedAt: input.conductedAt ? new Date(input.conductedAt) : new Date(),
      },
    });
    return resultToDTO(row);
  }

  async removeResult(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.clinicalScaleResult.findUnique({
      where: { id },
      select: { id: true, patientId: true },
    });
    if (!exists) return false;
    const patient = await this.assertPatientBelongsToClinic(clinicId, exists.patientId);
    if (!patient) return false;
    await prisma.clinicalScaleResult.delete({ where: { id } });
    return true;
  }

  private async assertPatientBelongsToClinic(clinicId: string, patientId: string) {
    return prisma.patient.findFirst({
      where: { id: patientId, clinicId, deletedAt: null },
      select: { id: true },
    });
  }
}

export const clinicalScalesService = new ClinicalScalesService();

function scaleToDTO(r: {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
  domain: unknown;
  isSystem: boolean;
  createdAt: Date;
}): ClinicalScale {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    type: r.type,
    domain: r.domain,
    isSystem: r.isSystem,
    createdAt: r.createdAt.toISOString(),
  };
}

function resultToDTO(r: {
  id: string;
  patientId: string;
  scaleId: string;
  therapistId: string | null;
  appointmentId: string | null;
  score: unknown;
  notes: string | null;
  conductedAt: Date;
  createdAt: Date;
}): ClinicalScaleResult {
  return {
    id: r.id,
    patientId: r.patientId,
    scaleId: r.scaleId,
    therapistId: r.therapistId,
    appointmentId: r.appointmentId,
    score: r.score,
    notes: r.notes,
    conductedAt: r.conductedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}
