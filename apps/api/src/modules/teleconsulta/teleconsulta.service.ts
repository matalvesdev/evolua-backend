import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { randomBytes } from 'node:crypto';

function generateLink(): string {
  return `https://meet.evolua.app/fono/${randomBytes(24).toString('base64url')}`;
}

export class TeleconsultaService {
  async list(clinicId: string) {
    const rows = await prisma.teleSession.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      patient: r.patientName,
      patientId: r.patientId,
      date: r.date,
      time: r.time,
      link: r.link,
      status: r.status as 'scheduled' | 'active' | 'ended',
      sentViaWhatsApp: r.sentViaWhatsApp,
      clinicId: r.clinicId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async create(clinicId: string, input: { patientId: string; patient: string; date: string; time: string; sendWA: boolean }) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!patient) {
      const err = new Error('Patient not found');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }

    const link = generateLink();
    const row = await prisma.teleSession.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: patient.name,
        date: input.date,
        time: input.time,
        link,
        status: 'scheduled',
        sentViaWhatsApp: input.sendWA,
      },
    });
    logger.info('teleconsulta: session created');
    return {
      id: row.id,
      patient: row.patientName,
      patientId: row.patientId,
      date: row.date,
      time: row.time,
      link: row.link,
      status: row.status as 'scheduled' | 'active' | 'ended',
      sentViaWhatsApp: row.sentViaWhatsApp,
      clinicId: row.clinicId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async update(clinicId: string, id: string, input: { status?: 'scheduled' | 'active' | 'ended'; sentViaWhatsApp?: boolean }) {
    const existing = await prisma.teleSession.findFirst({
      where: { id, clinicId },
    });
    if (!existing) return null;

    const row = await prisma.teleSession.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.sentViaWhatsApp !== undefined && { sentViaWhatsApp: input.sentViaWhatsApp }),
      },
    });

    return {
      id: row.id,
      patient: row.patientName,
      patientId: row.patientId,
      date: row.date,
      time: row.time,
      link: row.link,
      status: row.status as 'scheduled' | 'active' | 'ended',
      sentViaWhatsApp: row.sentViaWhatsApp,
      clinicId: row.clinicId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export const teleconsultaService = new TeleconsultaService();
