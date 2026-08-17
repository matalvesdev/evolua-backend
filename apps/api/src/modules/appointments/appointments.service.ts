import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { emailService } from '../email/email.service.js';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CancelAppointmentInput,
  CompleteAppointmentInput,
  ListAppointmentsQuery,
  Appointment,
} from '@evolua/contracts';
import { appointmentToDTO } from './appointments.mapper.js';

/**
 * Cliente HTTP para sincronização com provedor de calendário.
 * Suporta Google Calendar via REST API e evolui para outros provedores.
 */
async function syncCalendar(
  action: 'create' | 'delete' | 'update',
  payload: Record<string, unknown>,
): Promise<{ eventId?: string }> {
  const { CALENDAR_SERVICE_URL, CALENDAR_SERVICE_TOKEN } = env;
  if (!CALENDAR_SERVICE_URL) return {};

  try {
    const res = await fetch(`${CALENDAR_SERVICE_URL}/api/calendar/events`, {
      method: action === 'delete' ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CALENDAR_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, action }, 'syncCalendar: HTTP error');
      return {};
    }
    const data = await res.json().catch(() => ({})) as { eventId?: string };
    return { eventId: data.eventId ?? undefined };
  } catch (err) {
    logger.warn({ err, action }, 'syncCalendar: request failed');
    return {};
  }
}

export class AppointmentsService {
  async list(clinicId: string, q: ListAppointmentsQuery) {
    const where: Prisma.AppointmentWhereInput = {
      clinicId,
      deletedAt: null,
      ...(q.patientId && { patientId: q.patientId }),
      ...(q.therapistId && { therapistId: q.therapistId }),
      ...(q.status && { status: q.status }),
      ...(q.type && { type: q.type }),
      ...((q.startDate || q.endDate) && {
        dateTime: {
          ...(q.startDate && { gte: new Date(q.startDate) }),
          ...(q.endDate && { lte: new Date(q.endDate) }),
        },
      }),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { dateTime: 'asc' },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      data: rows.map(appointmentToDTO),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }

  async findById(clinicId: string, id: string): Promise<Appointment | null> {
    const row = await prisma.appointment.findFirst({
      where: { id, clinicId, deletedAt: null },
    });
    return row ? appointmentToDTO(row) : null;
  }

  async create(clinicId: string, input: CreateAppointmentInput): Promise<Appointment> {
    const patient = await this.assertPatientBelongsToClinic(clinicId, input.patientId);
    const row = await prisma.appointment.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: patient.name,
        therapistId: input.therapistId ?? null,
        therapistName: input.therapistName,
        dateTime: new Date(input.dateTime),
        duration: input.duration,
        type: input.type,
        notes: input.notes ?? null,
      },
    });

    // Sync com Google Calendar (best-effort — não bloqueia)
    if (row.therapistId) {
      try {
        const { eventId } = await syncCalendar('create', {
          therapistId: row.therapistId,
          appointment: appointmentToDTO(row),
        });
        if (eventId) {
          await prisma.appointment.update({
            where: { id: row.id },
            data: { googleCalendarEventId: eventId },
          });
          row.googleCalendarEventId = eventId;
        }
      } catch {
        // log feito pelo plugin de erro do Fastify caller; aqui apenas absorvemos
      }
    }

    return appointmentToDTO(row);
  }

  async update(
    clinicId: string,
    id: string,
    input: UpdateAppointmentInput,
  ): Promise<Appointment | null> {
    const exists = await prisma.appointment.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;

    const row = await prisma.appointment.update({
      where: { id },
      data: {
        ...(input.dateTime !== undefined && { dateTime: new Date(input.dateTime) }),
        ...(input.duration !== undefined && { duration: input.duration }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.sessionNotes !== undefined && { sessionNotes: input.sessionNotes }),
      },
    });
    return appointmentToDTO(row);
  }

  async confirm(clinicId: string, id: string): Promise<Appointment | null> {
    const appt = await this.findById(clinicId, id);
    if (!appt) return null;

    const updated = await this.transition(clinicId, id, {
      status: 'confirmed',
      confirmedAt: new Date(),
    });

    // Envia lembretes conforme configuração da clínica
    if (updated && emailService.isEnabled()) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { settings: true },
      });
      const settings = (clinic?.settings ?? {}) as Record<string, unknown>;
      const autoSend = (settings.autoSendReminders as boolean) ?? false;
      const send24h = (settings.reminder24h as boolean) ?? true;
      const send1h = (settings.reminder1h as boolean) ?? false;

      if (autoSend && (send24h || send1h)) {
        const patient = await prisma.patient.findFirst({
          where: { id: updated.patientId, clinicId },
          select: { name: true, email: true },
        });
        const to = patient?.email;
        if (to) {
          const dt = new Date(updated.dateTime);
          const date = dt.toLocaleDateString('pt-BR');
          const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          if (send24h) {
            emailService
              .sendAppointmentReminder24h(to, patient.name, date, time)
              .then(() =>
                prisma.appointment.update({
                  where: { id: updated.id },
                  data: { reminder24hSentAt: new Date() },
                }).catch(() => {}),
              )
              .catch(() => logger.warn('24h reminder email failed'));
          }

          if (send1h) {
            emailService
              .sendAppointmentReminder1h(to, patient.name, date, time)
              .then(() =>
                prisma.appointment.update({
                  where: { id: updated.id },
                  data: { reminder1hSentAt: new Date() },
                }).catch(() => {}),
              )
              .catch(() => logger.warn('1h reminder email failed'));
          }
        }
      }
    }

    return updated;
  }

  async start(clinicId: string, id: string): Promise<Appointment | null> {
    return this.transition(clinicId, id, {
      status: 'in_progress',
      startedAt: new Date(),
    });
  }

  /**
   * Completa o agendamento e auto-cria um relatório de evolução em rascunho.
   * Falha do report NÃO reverte o complete (best-effort) — comportamento
   * preservado do legacy.
   */
  async complete(
    clinicId: string,
    id: string,
    input: CompleteAppointmentInput,
  ): Promise<Appointment | null> {
    const appt = await prisma.appointment.findFirst({
      where: { id, clinicId, deletedAt: null },
    });
    if (!appt) return null;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        sessionNotes: input.sessionNotes ?? appt.sessionNotes,
      },
    });

    // Auto-cria evolução em draft
    try {
      const therapist = appt.therapistId
        ? await prisma.user.findUnique({
            where: { id: appt.therapistId },
            select: { fullName: true, crfa: true },
          })
        : null;

      const dateStr = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      await prisma.report.create({
        data: {
          clinicId,
          patientId: appt.patientId,
          patientName: appt.patientName,
          therapistId: appt.therapistId,
          therapistName: therapist?.fullName ?? appt.therapistName,
          therapistCrfa: therapist?.crfa ?? '',
          type: 'evolution',
          title: `Sessão ${appt.patientName} - ${dateStr}`,
          content: input.sessionNotes ?? '',
          status: 'draft',
          appointmentId: id,
        },
      });
    } catch {
      // best-effort
    }

    return appointmentToDTO(updated);
  }

  async cancel(
    clinicId: string,
    id: string,
    input: CancelAppointmentInput,
  ): Promise<Appointment | null> {
    const appt = await prisma.appointment.findFirst({
      where: { id, clinicId, deletedAt: null },
    });
    if (!appt) return null;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancellationReason: input.reason,
        cancellationNotes: input.notes ?? null,
        cancelledBy: input.cancelledBy,
        cancelledAt: new Date(),
      },
    });

    if (appt.therapistId && appt.googleCalendarEventId) {
      try {
        await syncCalendar('delete', {
          therapistId: appt.therapistId,
          eventId: appt.googleCalendarEventId,
        });
      } catch {
        // best-effort
      }
    }

    return appointmentToDTO(updated);
  }

  async remove(clinicId: string, id: string): Promise<Appointment | null> {
    const exists = await prisma.appointment.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;

    const row = await prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return appointmentToDTO(row);
  }

  // -- helpers -------------------------------------------------------------

  private async transition(
    clinicId: string,
    id: string,
    data: Prisma.AppointmentUpdateInput,
  ): Promise<Appointment | null> {
    const exists = await prisma.appointment.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;

    const row = await prisma.appointment.update({ where: { id }, data });
    return appointmentToDTO(row);
  }

  private async assertPatientBelongsToClinic(
    clinicId: string,
    patientId: string,
  ): Promise<{ id: string; name: string }> {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (patient) return patient;

    const err = new Error('Patient not found');
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }
}

export const appointmentsService = new AppointmentsService();
