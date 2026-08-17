import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateReportInput,
  UpdateReportInput,
  ReviewReportInput,
  SendReportInput,
  ListReportsQuery,
  Report,
} from '@evolua/contracts';
import { reportToDTO } from './reports.mapper.js';

export class ReportsService {
  async list(clinicId: string, q: ListReportsQuery) {
    const where: Prisma.ReportWhereInput = {
      clinicId,
      deletedAt: null,
      ...(q.patientId && { patientId: q.patientId }),
      ...(q.therapistId && { therapistId: q.therapistId }),
      ...(q.status && { status: q.status }),
      ...(q.type && { type: q.type }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);
    return {
      data: rows.map(reportToDTO),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }

  async findById(clinicId: string, id: string): Promise<Report | null> {
    const row = await prisma.report.findFirst({ where: { id, clinicId, deletedAt: null } });
    return row ? reportToDTO(row) : null;
  }

  async create(
    clinicId: string,
    therapistId: string,
    input: CreateReportInput,
  ): Promise<Report> {
    const patient = await this.assertPatientBelongsToClinic(clinicId, input.patientId);
    await this.assertAppointmentBelongsToPatient(clinicId, input.patientId, input.appointmentId);
    const row = await prisma.report.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: patient.name,
        therapistId,
        therapistName: input.therapistName,
        therapistCrfa: input.therapistCrfa,
        type: input.type,
        title: input.title,
        content: input.content,
        sections: (input.sections as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        appointmentId: input.appointmentId ?? null,
        periodStartDate: input.periodStartDate ? new Date(input.periodStartDate) : null,
        periodEndDate: input.periodEndDate ? new Date(input.periodEndDate) : null,
      },
    });
    return reportToDTO(row);
  }

  async update(
    clinicId: string,
    id: string,
    input: UpdateReportInput,
  ): Promise<Report | null> {
    const exists = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.report.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.transcription !== undefined && { transcription: input.transcription }),
        ...(input.sections !== undefined && {
          sections: (input.sections as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        }),
        ...(input.periodStartDate !== undefined && {
          periodStartDate: input.periodStartDate ? new Date(input.periodStartDate) : null,
        }),
        ...(input.periodEndDate !== undefined && {
          periodEndDate: input.periodEndDate ? new Date(input.periodEndDate) : null,
        }),
      },
    });
    return reportToDTO(row);
  }

  async submitForReview(clinicId: string, id: string): Promise<Report | null> {
    return this.transition(clinicId, id, { status: 'review' });
  }

  async review(
    clinicId: string,
    id: string,
    reviewerId: string,
    input: ReviewReportInput,
  ): Promise<Report | null> {
    return this.transition(clinicId, id, {
      status: 'review',
      reviewer: { connect: { id: reviewerId } },
      reviewedAt: new Date(),
      reviewNotes: input.notes ?? null,
    });
  }

  async approve(
    clinicId: string,
    id: string,
    approverId: string,
  ): Promise<Report | null> {
    return this.transition(clinicId, id, {
      status: 'approved',
      approver: { connect: { id: approverId } },
      approvedAt: new Date(),
    });
  }

  async send(
    clinicId: string,
    id: string,
    input: SendReportInput,
  ): Promise<Report | null> {
    return this.transition(clinicId, id, {
      status: 'sent',
      sentAt: new Date(),
      sentTo: input.recipients,
    });
  }

  async listLaudos(clinicId: string, q: { page: number; pageSize: number; patientId?: string; status?: string }) {
    const laudoTypes = ['laudo', 'atestado', 'declaracao', 'relatorio'];
    const where: Prisma.ReportWhereInput = {
      clinicId,
      deletedAt: null,
      type: { in: laudoTypes },
      ...(q.patientId && { patientId: q.patientId }),
      ...(q.status && { status: q.status }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);
    return {
      data: rows.map(reportToDTO),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }

  async createLaudo(
    clinicId: string,
    therapistId: string,
    input: { patientId: string; patientName: string; therapistName: string; therapistCrfa: string; type: string; title: string; content: string },
  ): Promise<Report> {
    const patient = await this.assertPatientBelongsToClinic(clinicId, input.patientId);
    const row = await prisma.report.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: patient.name,
        therapistId,
        therapistName: input.therapistName,
        therapistCrfa: input.therapistCrfa,
        type: input.type,
        title: input.title,
        content: input.content,
        sections: Prisma.JsonNull,
      },
    });
    return reportToDTO(row);
  }

  async remove(clinicId: string, id: string): Promise<Report | null> {
    const exists = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.report.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return reportToDTO(row);
  }

  private async transition(
    clinicId: string,
    id: string,
    data: Prisma.ReportUpdateInput,
  ): Promise<Report | null> {
    const exists = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.report.update({ where: { id }, data });
    return reportToDTO(row);
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

  private async assertAppointmentBelongsToPatient(
    clinicId: string,
    patientId: string,
    appointmentId?: string | null,
  ): Promise<void> {
    if (!appointmentId) return;
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId, patientId, deletedAt: null },
      select: { id: true },
    });
    if (!appointment) {
      throw Object.assign(new Error('Appointment not found for this patient'), { statusCode: 404 });
    }
  }
}

export const reportsService = new ReportsService();
