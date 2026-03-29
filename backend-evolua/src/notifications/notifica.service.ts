import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SubscriberData {
  externalId: string;
  email: string;
  name: string;
  phone?: string;
  locale?: string;
  customProperties?: Record<string, any>;
}

export interface SendNotificationOptions {
  subscriberId: string;
  channel: 'email' | 'in_app';
  templateId?: string;
  variables?: Record<string, string>;
  payload?: {
    from?: string;
    subject?: string;
    title?: string;
    body?: string;
    html_body?: string;
    text_body?: string;
    metadata?: Record<string, any>;
  };
  idempotencyKey?: string;
}

export interface NotificaNotificationResponse {
  id: string;
  channel: string;
  status: string;
  recipient: string;
  created_at: string;
}

@Injectable()
export class NotificaService {
  private readonly logger = new Logger(NotificaService.name);
  private readonly client: AxiosInstance;
  private readonly templateMap: Record<string, string | undefined>;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('NOTIFICA_API_KEY', '');

    this.client = axios.create({
      baseURL: 'https://app.usenotifica.com.br/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.templateMap = {
      appointment_reminder: this.config.get<string>(
        'NOTIFICA_TEMPLATE_APPOINTMENT_REMINDER',
      ),
      report_ready: this.config.get<string>(
        'NOTIFICA_TEMPLATE_REPORT_READY',
      ),
      welcome: this.config.get<string>('NOTIFICA_TEMPLATE_WELCOME'),
    };
  }

  async upsertSubscriber(data: SubscriberData): Promise<void> {
    try {
      const payload: Record<string, any> = {
        external_id: data.externalId,
        email: data.email,
        name: data.name,
        locale: data.locale ?? 'pt-BR',
        custom_properties: data.customProperties ?? {},
      };

      if (data.phone) {
        payload.phone = data.phone;
      }

      await this.client.post('/subscribers', payload);
      this.logger.log(
        `Subscriber upserted: ${data.externalId}`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao sincronizar subscriber ${data.externalId}: ${error.message}`,
      );
    }
  }

  async sendNotification(
    options: SendNotificationOptions,
  ): Promise<NotificaNotificationResponse | null> {
    try {
      const payload: Record<string, any> = {
        channel: options.channel,
        subscriber_id: options.subscriberId,
      };

      if (options.templateId) {
        payload.template_id = options.templateId;
        if (options.variables) {
          payload.variables = options.variables;
        }
      } else if (options.payload) {
        payload.payload = options.payload;
      }

      const headers: Record<string, string> = {};
      if (options.idempotencyKey) {
        headers['Idempotency-Key'] = options.idempotencyKey;
      }

      const { data } = await this.client.post('/notifications', payload, {
        headers,
      });

      this.logger.log(
        `Notificação enviada (${options.channel}) para ${options.subscriberId} - ID: ${data.id}`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Falha ao enviar notificação (${options.channel}) para ${options.subscriberId}: ${error.message}`,
      );
      return null;
    }
  }

  getPublishableKey(): string {
    return this.config.get<string>('NOTIFICA_PUBLISHABLE_KEY', '');
  }

  getTemplateId(type: string): string | undefined {
    return this.templateMap[type];
  }
}
