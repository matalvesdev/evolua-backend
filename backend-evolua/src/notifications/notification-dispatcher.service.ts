import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { EmailService } from './email.service';
import { WebPushService } from './web-push.service';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly preferencesService: NotificationPreferencesService,
    private readonly emailService: EmailService,
    private readonly webPushService: WebPushService,
    private readonly prisma: PrismaService,
  ) {}

  async dispatch(notification: Notification): Promise<void> {
    const preferences = await this.preferencesService.getOrCreate(
      notification.userId,
      notification.clinicId,
    );

    if (preferences.emailEnabled) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: notification.userId },
          select: { email: true },
        });

        if (user?.email) {
          await this.emailService.sendEmail({
            to: user.email,
            subject: notification.title,
            htmlBody: notification.body,
          });
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to send email for notification ${notification.id}: ${error.message}`,
        );
      }
    }

    if (preferences.pushEnabled) {
      try {
        await this.webPushService.sendToUser(
          notification.userId,
          notification.clinicId,
          {
            title: notification.title,
            body: notification.body,
            data: (notification.metadata as Record<string, any>) ?? undefined,
          },
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to send push for notification ${notification.id}: ${error.message}`,
        );
      }
    }
  }
}
