import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, UpdateReportDto, SearchReportsDto, ReviewReportDto } from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Report, Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, therapistId: string, dto: CreateReportDto): Promise<Report> {
    // Look up patient name
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId },
      select: { name: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    // Look up therapist info
    const therapist = await this.prisma.user.findUnique({
      where: { id: therapistId },
      select: { fullName: true, crfa: true },
    });
    if (!therapist) throw new NotFoundException('Terapeuta não encontrado');

    // Generate standardized title for evolution reports: "Sessão [Paciente] - [Data]"
    let title = dto.title;
    if (!title || dto.type === 'evolution') {
      const dateStr = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      title = `Sessão ${patient.name} - ${dateStr}`;
    }

    return this.prisma.report.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        patientName: patient.name,
        therapistId,
        therapistName: therapist.fullName,
        therapistCrfa: therapist.crfa || '',
        type: dto.type,
        title,
        content: dto.content || '',
        periodStartDate: dto.periodStartDate ? new Date(dto.periodStartDate) : undefined,
        periodEndDate: dto.periodEndDate ? new Date(dto.periodEndDate) : undefined,
        appointmentId: dto.appointmentId,
      },
    });
  }

  async findAll(clinicId: string, query: SearchReportsDto): Promise<PaginatedResponseDto<Report>> {
    const where: Prisma.ReportWhereInput = { clinicId };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { patientName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.patientId) where.patientId = query.patientId;
    if (query.therapistId) where.therapistId = query.therapistId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [reports, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);

    return new PaginatedResponseDto(reports, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOne(id: string, clinicId: string): Promise<Report> {
    const report = await this.prisma.report.findFirst({
      where: { id, clinicId },
      include: { patient: true },
    });
    if (!report) throw new NotFoundException('Relatório não encontrado');
    return report;
  }

  async update(id: string, clinicId: string, dto: UpdateReportDto): Promise<Report> {
    await this.findOne(id, clinicId);
    return this.prisma.report.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
        ...(dto.periodStartDate && { periodStartDate: new Date(dto.periodStartDate) }),
        ...(dto.periodEndDate && { periodEndDate: new Date(dto.periodEndDate) }),
      },
    });
  }

  async submitForReview(id: string, clinicId: string): Promise<Report> {
    await this.findOne(id, clinicId);
    return this.prisma.report.update({
      where: { id },
      data: { status: 'pending_review' },
    });
  }

  async review(id: string, clinicId: string, reviewerId: string, dto: ReviewReportDto): Promise<Report> {
    await this.findOne(id, clinicId);
    return this.prisma.report.update({
      where: { id },
      data: {
        status: 'reviewed',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
    });
  }

  async approve(id: string, clinicId: string, approverId: string): Promise<Report> {
    await this.findOne(id, clinicId);
    return this.prisma.report.update({
      where: { id },
      data: { status: 'approved', approvedBy: approverId, approvedAt: new Date() },
    });
  }

  async remove(id: string, clinicId: string): Promise<void> {
    await this.findOne(id, clinicId);
    await this.prisma.report.delete({ where: { id } });
  }
}
