import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscriptionsService } from './push-subscriptions.service';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, any>;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {
    const subject = this.config.get<string>('VAPID_SUBJECT', '');
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY', '');

    if (subject && publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  async sendToUser(
    userId: string,
    clinicId: string,
    payload: PushPayload,
  ): Promise<void> {
    try {
      const subscriptions = await this.pushSubscriptionsService.findByUser(
        userId,
        clinicId,
      );

      const payloadStr = JSON.stringify(payload);

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payloadStr,
          );
        } catch (error: any) {
          if (error.statusCode === 410) {
            this.logger.warn(
              `Push subscription gone (410) for endpoint ${subscription.endpoint}, removing`,
            );
            await this.pushSubscriptionsService.removeByEndpoint(
              subscription.endpoint,
            );
          } else {
            this.logger.error(
              `Failed to send push to endpoint ${subscription.endpoint}: ${error.message}`,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send push notifications to user ${userId}: ${error.message}`,
      );
    }
  }
}
