import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { NotificationPreferencesService } from './notification-preferences.service';

import { PushSubscriptionsService } from './push-subscriptions.service';
import { WebPushService } from './web-push.service';
import { NotificationsService } from './notifications.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';

import { NotificationPreferencesController } from './notification-preferences.controller';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  // PrismaModule and ConfigModule are global — no need to import them here
  controllers: [
    NotificationPreferencesController,
    PushSubscriptionsController,
    NotificationsController,
  ],
  providers: [
    EmailService,
    NotificationPreferencesService,
    PushSubscriptionsService,
    WebPushService,
    NotificationsService,
    NotificationDispatcherService,
  ],
  exports: [
    EmailService,
    NotificationsService,
    NotificationDispatcherService,
  ],
})
export class NotificationsModule {}
