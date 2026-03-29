import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificaService,
  NotificaNotificationResponse,
} from './notifica.service';

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  subscriberId?: string;
  idempotencyKey?: string;
}

export interface NotificationResponse {
  id: string;
  channel: string;
  status: string;
  recipient: string;
  created_at: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly defaultFrom: string;

  constructor(
    private readonly config: ConfigService,
    private readonly notificaService: NotificaService,
  ) {
    this.defaultFrom = this.config.get<string>(
      'NOTIFICA_FROM_EMAIL',
      'noreply@useevolua.com',
    );
  }

  async sendEmail(
    options: SendEmailOptions,
  ): Promise<NotificationResponse | null> {
    const result = await this.notificaService.sendNotification({
      subscriberId: options.subscriberId ?? options.to,
      channel: 'email',
      payload: {
        from: options.from || this.defaultFrom,
        subject: options.subject,
        html_body: options.htmlBody,
        text_body: options.textBody || this.stripHtml(options.htmlBody),
      },
      idempotencyKey: options.idempotencyKey,
    });

    if (result) {
      this.logger.log(`Email enviado para ${options.to} - ID: ${result.id}`);
    }

    return result as NotificationResponse | null;
  }

  async sendAppointmentReminder(
    patientEmail: string,
    patientName: string,
    date: string,
    time: string,
  ): Promise<NotificationResponse | null> {
    const templateId = this.notificaService.getTemplateId(
      'appointment_reminder',
    );

    if (templateId) {
      const result = await this.notificaService.sendNotification({
        subscriberId: patientEmail,
        channel: 'email',
        templateId,
        variables: {
          name: patientName,
          date,
          time,
        },
        idempotencyKey: `reminder-${patientEmail}-${date}-${time}`,
      });

      if (result) {
        this.logger.log(
          `Email de lembrete enviado para ${patientEmail} - ID: ${result.id}`,
        );
      }

      return result as NotificationResponse | null;
    }

    return this.sendEmail({
      to: patientEmail,
      subject: `Lembrete: Sua consulta está agendada para ${date}`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Olá, ${patientName}!</h2>
          <p>Este é um lembrete da sua consulta agendada:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Data:</strong> ${date}</p>
            <p style="margin: 4px 0;"><strong>Horário:</strong> ${time}</p>
          </div>
          <p>Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
            Enviado por Evolua CRM
          </p>
        </div>
      `,
      idempotencyKey: `reminder-${patientEmail}-${date}-${time}`,
    });
  }

  async sendWelcomeEmail(
    email: string,
    name: string,
  ): Promise<NotificationResponse | null> {
    const templateId = this.notificaService.getTemplateId('welcome');

    if (templateId) {
      const result = await this.notificaService.sendNotification({
        subscriberId: email,
        channel: 'email',
        templateId,
        variables: {
          name,
        },
        idempotencyKey: `welcome-${email}`,
      });

      if (result) {
        this.logger.log(
          `Email de boas-vindas enviado para ${email} - ID: ${result.id}`,
        );
      }

      return result as NotificationResponse | null;
    }

    return this.sendEmail({
      to: email,
      subject: 'Bem-vindo ao Evolua!',
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Bem-vindo, ${name}!</h2>
          <p>Sua conta no Evolua CRM foi criada com sucesso.</p>
          <p>Agora você pode gerenciar seus pacientes, agendamentos e relatórios de forma simples e eficiente.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
            Enviado por Evolua CRM
          </p>
        </div>
      `,
      idempotencyKey: `welcome-${email}`,
    });
  }

  async sendReportReady(
    patientEmail: string,
    patientName: string,
    reportType: string,
  ): Promise<NotificationResponse | null> {
    const templateId = this.notificaService.getTemplateId('report_ready');

    if (templateId) {
      const result = await this.notificaService.sendNotification({
        subscriberId: patientEmail,
        channel: 'email',
        templateId,
        variables: {
          name: patientName,
          reportType,
        },
        idempotencyKey: `report-${patientEmail}-${reportType}-${Date.now()}`,
      });

      if (result) {
        this.logger.log(
          `Email de relatório enviado para ${patientEmail} - ID: ${result.id}`,
        );
      }

      return result as NotificationResponse | null;
    }

    return this.sendEmail({
      to: patientEmail,
      subject: `Seu relatório está pronto - ${reportType}`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Olá, ${patientName}!</h2>
          <p>Seu relatório de <strong>${reportType}</strong> está pronto e disponível para consulta.</p>
          <p>Entre em contato com seu profissional para mais detalhes.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
            Enviado por Evolua CRM
          </p>
        </div>
      `,
      idempotencyKey: `report-${patientEmail}-${reportType}-${Date.now()}`,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}
