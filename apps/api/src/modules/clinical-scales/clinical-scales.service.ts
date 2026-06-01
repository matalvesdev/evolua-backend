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

  async listResults(patientId: string, scaleId?: string) {
    const where: { patientId: string; scaleId?: string } = { patientId };
    if (scaleId) where.scaleId = scaleId;
    const rows = await prisma.clinicalScaleResult.findMany({
      where,
      orderBy: { conductedAt: 'desc' },
    });
    return rows.map(resultToDTO);
  }

  async recordResult(
    therapistId: string,
    input: RecordScaleResultInput,
  ): Promise<ClinicalScaleResult> {
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

  async removeResult(id: string): Promise<ClinicalScaleResult | null> {
    const exists = await prisma.clinicalScaleResult.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return null;
    await prisma.clinicalScaleResult.delete({ where: { id } });
    return exists as unknown as ClinicalScaleResult;
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
