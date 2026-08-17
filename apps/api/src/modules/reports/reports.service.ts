import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireResourceOwnerOrClinicAdmin } from '../auth/auth.helpers.js';
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
  private static readonly IMMUTABLE_STATUSES = new Set(['approved', 'sent', 'signed']);

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
    const therapist = await this.assertTherapistBelongsToClinic(clinicId, therapistId);
    const row = await prisma.report.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: patient.name,
        therapistId,
        therapistName: therapist.fullName,
        therapistCrfa: therapist.crfa ?? '',
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
    actorId: string,
    id: string,
    input: UpdateReportInput,
  ): Promise<Report | null> {
    const exists = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true, status: true, therapistId: true },
    });
    if (!exists) return null;
    await requireResourceOwnerOrClinicAdmin(actorId, exists.therapistId);
    this.assertMutable(exists.status);
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

  async submitForReview(clinicId: string, actorId: string, id: string): Promise<Report | null> {
    await this.assertReportOwnership(clinicId, id, actorId);
    return this.transition(clinicId, id, { status: 'review' });
  }

  async review(
    clinicId: string,
    id: string,
    reviewerId: string,
    input: ReviewReportInput,
  ): Promise<Report | null> {
    await this.assertReportOwnership(clinicId, id, reviewerId);
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
    // Não há transporte seguro de documento (arquivo assinado, expiração,
    // consentimento e confirmação do provider) implementado neste módulo.
    // Marcar o laudo como enviado sem entregar conteúdo é uma violação de
    // integridade clínica; manter o endpoint explícito até a entrega existir.
    void clinicId;
    void id;
    void input;
    throw Object.assign(
      new Error('Secure report delivery is not configured'),
      { statusCode: 501 },
    );
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
    input: { patientId: string; type: string; title: string; content: string },
  ): Promise<Report> {
    const patient = await this.assertPatientBelongsToClinic(clinicId, input.patientId);
    const therapist = await this.assertTherapistBelongsToClinic(clinicId, therapistId);
    const row = await prisma.report.create({
      data: {
        clinicId,
        patientId: input.patientId,
        patientName: patient.name,
        therapistId,
        therapistName: therapist.fullName,
        therapistCrfa: therapist.crfa ?? '',
        type: input.type,
        title: input.title,
        content: input.content,
        sections: Prisma.JsonNull,
      },
    });
    return reportToDTO(row);
  }

  async remove(clinicId: string, actorId: string, id: string): Promise<Report | null> {
    const exists = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true, status: true, therapistId: true },
    });
    if (!exists) return null;
    await requireResourceOwnerOrClinicAdmin(actorId, exists.therapistId);
    this.assertMutable(exists.status);
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

  private assertMutable(status: string): void {
    if (!ReportsService.IMMUTABLE_STATUSES.has(status)) return;
    const error = new Error('Finalized clinical records cannot be changed or deleted');
    Object.assign(error, { statusCode: 409 });
    throw error;
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

  private async assertTherapistBelongsToClinic(
    clinicId: string,
    therapistId: string,
  ): Promise<{ fullName: string; crfa: string | null }> {
    const therapist = await prisma.user.findFirst({
      where: { id: therapistId, clinicId },
      select: { fullName: true, crfa: true },
    });
    if (therapist) return therapist;

    throw Object.assign(new Error('Authenticated professional is not part of this clinic'), {
      statusCode: 403,
    });
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

  private async assertReportOwnership(clinicId: string, id: string, actorId: string): Promise<void> {
    const report = await prisma.report.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { therapistId: true },
    });
    if (!report) return;
    await requireResourceOwnerOrClinicAdmin(actorId, report.therapistId);
  }
}

export const reportsService = new ReportsService();
