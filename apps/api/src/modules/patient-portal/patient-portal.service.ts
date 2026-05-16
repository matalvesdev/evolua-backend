import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';

export interface AppointmentPublicView {
  id: string;
  patientName: string;
  dateTime: string;
  duration: number;
  type: string;
  therapistName: string;
  status: string;
  clinicName: string;
  /** Não exposto via response schema; uso interno para audit log. */
  clinicId: string;
}

export class PatientPortalService {
  /**
   * Gera token de confirmação válido por 48h. O envio efetivo do link
   * via WhatsApp é responsabilidade do serviço Go de WhatsApp — este
   * método apenas grava o token e retorna a URL pronta para envio.
   */
  async generateConfirmationLink(
    clinicId: string,
    appointmentId: string,
    frontendUrl: string,
  ): Promise<{ link: string; expiresAt: string } | null> {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!appt) return null;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        confirmationToken: token,
        confirmationTokenExpiresAt: expiresAt,
      },
    });

    return {
      link: `${frontendUrl.replace(/\/$/, '')}/confirmar/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getByToken(token: string): Promise<AppointmentPublicView | { error: string }> {
    const appt = await prisma.appointment.findFirst({
      where: { confirmationToken: token, deletedAt: null },
      include: { clinic: { select: { name: true } } },
    });
    if (!appt) return { error: 'invalid' };
    if (appt.confirmationTokenExpiresAt && new Date() > appt.confirmationTokenExpiresAt) {
      return { error: 'expired' };
    }

    return {
      id: appt.id,
      patientName: appt.patientName,
      dateTime: appt.dateTime.toISOString(),
      duration: appt.duration,
      type: appt.type,
      therapistName: appt.therapistName,
      status: appt.status,
      clinicName: appt.clinic.name,
      clinicId: appt.clinicId,
    };
  }

  async confirmByToken(token: string): Promise<
    { ok: true; message: string; appointmentId: string; clinicId: string }
    | { ok: false; message: string; appointmentId?: string; clinicId?: string }
  > {
    const appt = await prisma.appointment.findFirst({
      where: { confirmationToken: token, deletedAt: null },
    });
    if (!appt) return { ok: false, message: 'Link inválido' };
    if (appt.confirmationTokenExpiresAt && new Date() > appt.confirmationTokenExpiresAt) {
      return { ok: false, message: 'Link expirado', appointmentId: appt.id, clinicId: appt.clinicId };
    }
    if (appt.status === 'cancelled') {
      return { ok: false, message: 'Este agendamento foi cancelado', appointmentId: appt.id, clinicId: appt.clinicId };
    }
    if (appt.status === 'confirmed') {
      return { ok: true, message: 'Agendamento já confirmado', appointmentId: appt.id, clinicId: appt.clinicId };
    }
    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationToken: null,
        confirmationTokenExpiresAt: null,
      },
    });
    return { ok: true, message: 'Agendamento confirmado', appointmentId: appt.id, clinicId: appt.clinicId };
  }

  async cancelByToken(
    token: string,
    reason?: string,
  ): Promise<
    { ok: true; message: string; appointmentId: string; clinicId: string }
    | { ok: false; message: string; appointmentId?: string; clinicId?: string }
  > {
    const appt = await prisma.appointment.findFirst({
      where: { confirmationToken: token, deletedAt: null },
    });
    if (!appt) return { ok: false, message: 'Link inválido' };
    if (appt.confirmationTokenExpiresAt && new Date() > appt.confirmationTokenExpiresAt) {
      return { ok: false, message: 'Link expirado', appointmentId: appt.id, clinicId: appt.clinicId };
    }
    if (appt.status === 'cancelled') {
      return { ok: true, message: 'Agendamento já estava cancelado', appointmentId: appt.id, clinicId: appt.clinicId };
    }
    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: 'cancelled',
        cancellationReason: reason ?? 'patient_request',
        cancelledBy: 'guardian',
        cancelledAt: new Date(),
        confirmationToken: null,
        confirmationTokenExpiresAt: null,
      },
    });
    return { ok: true, message: 'Agendamento cancelado', appointmentId: appt.id, clinicId: appt.clinicId };
  }
}

export const patientPortalService = new PatientPortalService();
