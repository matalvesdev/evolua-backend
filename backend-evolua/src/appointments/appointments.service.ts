import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, UpdateAppointmentDto, CancelAppointmentDto, SearchAppointmentsDto } from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Appointment, Prisma } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    return this.prisma.appointment.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        patientName: dto.patientName,
        therapistId: dto.therapistId,
        therapistName: dto.therapistName,
        dateTime: new Date(dto.dateTime),
        duration: dto.duration ?? 60,
        type: dto.type,
        notes: dto.notes,
      },
    });
  }

  async findAll(clinicId: string, query: SearchAppointmentsDto): Promise<PaginatedResponseDto<Appointment>> {
    const where: Prisma.AppointmentWhereInput = { clinicId };

    if (query.patientId) where.patientId = query.patientId;
    if (query.therapistId) where.therapistId = query.therapistId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.dateTime = {};
      if (query.startDate) where.dateTime.gte = new Date(query.startDate);
      if (query.endDate) where.dateTime.lte = new Date(query.endDate);
    }

    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { dateTime: 'asc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return new PaginatedResponseDto(appointments, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOne(id: string, clinicId: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
      include: { patient: true },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  async update(id: string, clinicId: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    await this.findOne(id, clinicId);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.dateTime && { dateTime: new Date(dto.dateTime) }),
        ...(dto.duration && { duration: dto.duration }),
        ...(dto.type && { type: dto.type }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.sessionNotes !== undefined && { sessionNotes: dto.sessionNotes }),
      },
    });
  }

  async confirm(id: string, clinicId: string): Promise<Appointment> {
    await this.findOne(id, clinicId);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });
  }

  async start(id: string, clinicId: string): Promise<Appointment> {
    await this.findOne(id, clinicId);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'in_progress', startedAt: new Date() },
    });
  }

  async complete(id: string, clinicId: string, sessionNotes?: string): Promise<Appointment> {
    const appointment = await this.findOne(id, clinicId);
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date(), sessionNotes },
    });

    // Auto-create evolution report for the completed appointment
    try {
      const therapist = await this.prisma.user.findUnique({
        where: { id: appointment.therapistId },
        select: { fullName: true, crfa: true },
      });

      const dateStr = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      await this.prisma.report.create({
        data: {
          clinicId,
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          therapistId: appointment.therapistId,
          therapistName: therapist?.fullName || appointment.therapistName,
          therapistCrfa: therapist?.crfa || '',
          type: 'evolution',
          title: `Sessão ${appointment.patientName} - ${dateStr}`,
          content: sessionNotes || '',
          status: 'draft',
          appointmentId: id,
        },
      });
      this.logger.log(`Auto-created evolution report for appointment ${id}`);
    } catch (error) {
      this.logger.error(`Failed to auto-create evolution report for appointment ${id}`, error);
      // Appointment remains completed even if report creation fails
    }

    return updated;
  }

  async cancel(id: string, clinicId: string, dto: CancelAppointmentDto): Promise<Appointment> {
    await this.findOne(id, clinicId);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancellationReason: dto.reason,
        cancellationNotes: dto.notes,
        cancelledBy: dto.cancelledBy,
        cancelledAt: new Date(),
      },
    });
  }

  async remove(id: string, clinicId: string): Promise<void> {
    await this.findOne(id, clinicId);
    await this.prisma.appointment.delete({ where: { id } });
  }
}
