import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

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

  async create(clinicId: string, input: {
    patientId: string;
    date: string;
    time: string;
    link: string;
    sendWA: boolean;
  }) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!patient) {
      const err = new Error('Patient not found');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (input.sendWA) {
      throw Object.assign(
        new Error('WhatsApp delivery for teleconsultation links is not configured'),
        { statusCode: 409 },
      );
    }

    const row = await prisma.teleSession.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: patient.name,
        date: input.date,
        time: input.time,
        link: input.link,
        status: 'scheduled',
        sentViaWhatsApp: input.sendWA,
      },
    });
    logger.info({ teleSessionId: row.id }, 'teleconsulta: session created');
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
