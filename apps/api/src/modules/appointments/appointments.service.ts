import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
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
 * Cliente HTTP fino para falar com o serviço Go de Google Calendar.
 * Por enquanto é stub: o serviço ainda não foi implementado.
 * TODO: extrair para `lib/services-client.ts` quando outros serviços forem usados.
 */
async function syncCalendar(
  action: 'create' | 'delete',
  payload: Record<string, unknown>,
): Promise<{ eventId?: string }> {
  // Marcador de TODO — ver apps/services/calendar/ (a implementar).
  void action;
  void payload;
  void env.WHATSAPP_SERVICE_URL; // ainda não temos URL específica de calendar
  return {};
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
    const row = await prisma.appointment.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: input.patientName,
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
    return this.transition(clinicId, id, {
      status: 'confirmed',
      confirmedAt: new Date(),
    });
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
}

export const appointmentsService = new AppointmentsService();
