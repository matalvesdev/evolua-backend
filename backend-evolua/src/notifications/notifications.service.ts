import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationPreferencesService } from './notification-preferences.service';

export interface CreateNotificationInput {
  userId: string;
  clinicId: string;
  type: 'appointment_reminder' | 'report_ready' | 'general';
  title: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface AppointmentReminderData {
  appointmentId: string;
  patientName: string;
  dateTime: Date | string;
}

export interface ReportNotificationData {
  reportId: string;
  reportType: string;
  patientName: string;
  generatedDate: Date | string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        clinicId: input.clinicId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata ?? undefined,
      },
    });

    try {
      await this.dispatcher.dispatch(notification);
    } catch (error: any) {
      this.logger.error(
        `Failed to dispatch notification ${notification.id}: ${error.message}`,
      );
    }

    return notification;
  }

  async findAll(
    userId: string,
    clinicId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<Notification>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, clinicId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, clinicId },
      }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async markAsRead(
    id: string,
    userId: string,
    clinicId: string,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, clinicId },
    });

    if (!notification) {
      throw new ForbiddenException(
        'Notification not found or does not belong to this user/clinic',
      );
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(
    userId: string,
    clinicId: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, clinicId, readAt: null },
      data: { readAt: new Date() },
    });

    return { count: result.count };
  }

  async getUnreadCount(
    userId: string,
    clinicId: string,
  ): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, clinicId, readAt: null },
    });

    return { count };
  }

  async createAppointmentReminder(
    userId: string,
    clinicId: string,
    appointmentData: AppointmentReminderData,
  ): Promise<Notification | null> {
    const preferences = await this.preferencesService.getOrCreate(
      userId,
      clinicId,
    );

    if (!preferences.appointmentRemindersEnabled) {
      return null;
    }

    const dateTime = new Date(appointmentData.dateTime);
    const date = dateTime.toISOString().split('T')[0];
    const time = dateTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return this.create({
      userId,
      clinicId,
      type: 'appointment_reminder',
      title: 'Lembrete de agendamento',
      body: `Você tem um agendamento com ${appointmentData.patientName} em ${date} às ${time}.`,
      metadata: {
        appointmentId: appointmentData.appointmentId,
        patientName: appointmentData.patientName,
        date,
        time,
      },
    });
  }

  async removeAppointmentReminder(
    appointmentId: string,
    userId: string,
    clinicId: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        clinicId,
        type: 'appointment_reminder',
        metadata: {
          path: ['appointmentId'],
          equals: appointmentId,
        },
      },
    });

    return { count: result.count };
  }

  async createReportNotification(
    userId: string,
    clinicId: string,
    reportData: ReportNotificationData,
  ): Promise<Notification | null> {
    const preferences = await this.preferencesService.getOrCreate(
      userId,
      clinicId,
    );

    if (!preferences.reportNotificationsEnabled) {
      return null;
    }

    const generatedDate =
      typeof reportData.generatedDate === 'string'
        ? reportData.generatedDate
        : reportData.generatedDate.toISOString();

    return this.create({
      userId,
      clinicId,
      type: 'report_ready',
      title: 'Relatório pronto',
      body: `O relatório ${reportData.reportType} de ${reportData.patientName} está pronto.`,
      metadata: {
        reportId: reportData.reportId,
        reportType: reportData.reportType,
        patientName: reportData.patientName,
        generatedDate,
      },
    });
  }
}
