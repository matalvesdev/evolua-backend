import type { Appointment as PrismaAppointment } from '@prisma/client';
import type { Appointment } from '@evolua/contracts';

export function appointmentToDTO(a: PrismaAppointment): Appointment {
  return {
    id: a.id,
    clinicId: a.clinicId,
    patientId: a.patientId,
    patientName: a.patientName,
    therapistId: a.therapistId,
    therapistName: a.therapistName,
    dateTime: a.dateTime.toISOString(),
    duration: a.duration,
    type: a.type,
    status: a.status,
    notes: a.notes,
    sessionNotes: a.sessionNotes,
    cancellationReason: a.cancellationReason,
    cancellationNotes: a.cancellationNotes,
    cancelledBy: a.cancelledBy,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    startedAt: a.startedAt?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    googleCalendarEventId: a.googleCalendarEventId,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
