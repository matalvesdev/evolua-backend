import type { Report as PrismaReport } from '@prisma/client';
import type { Report } from '@evolua/contracts';

export function reportToDTO(r: PrismaReport): Report {
  return {
    id: r.id,
    clinicId: r.clinicId,
    patientId: r.patientId,
    patientName: r.patientName,
    therapistId: r.therapistId,
    therapistName: r.therapistName,
    therapistCrfa: r.therapistCrfa,
    type: r.type,
    status: r.status,
    title: r.title,
    content: r.content,
    sections: r.sections ?? null,
    transcription: r.transcription,
    periodStartDate: r.periodStartDate ? r.periodStartDate.toISOString().slice(0, 10) : null,
    periodEndDate: r.periodEndDate ? r.periodEndDate.toISOString().slice(0, 10) : null,
    appointmentId: r.appointmentId,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNotes: r.reviewNotes,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    sentAt: r.sentAt?.toISOString() ?? null,
    sentTo: r.sentTo,
    signedAt: r.signedAt?.toISOString() ?? null,
    signedBy: r.signedBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
