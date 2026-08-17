import type { EmailClient } from '../../lib/email-client.js';
import { emailClient } from '../../lib/email-client.js';
import { logger } from '../../lib/logger.js';
import {
  welcomeEmail,
  passwordResetEmail,
  appointmentReminder24h,
  appointmentReminder1h,
  billingReceipt,
  reportReady,
  newsletterConfirmation,
  leadMagnetDelivery,
} from './email.templates.js';

export class EmailService {
  constructor(private client: EmailClient) {}

  isEnabled(): boolean {
    return this.client.isEnabled();
  }

  async sendWelcome(to: string, name: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = welcomeEmail(name);
    logger.info({ template: 'welcome' }, 'Sending welcome email');
    return this.client.sendEmail({ to, subject, html });
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = passwordResetEmail(resetLink);
    logger.info({ template: 'passwordReset' }, 'Sending password reset email');
    return this.client.sendEmail({ to, subject, html });
  }

  async sendAppointmentReminder24h(to: string, patientName: string, date: string, time: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = appointmentReminder24h(patientName, date, time);
    logger.info({ template: 'appointmentReminder24h' }, 'Sending 24h reminder');
    return this.client.sendEmail({ to, subject, html });
  }

  async sendAppointmentReminder1h(to: string, patientName: string, date: string, time: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = appointmentReminder1h(patientName, date, time);
    logger.info({ template: 'appointmentReminder1h' }, 'Sending 1h reminder');
    return this.client.sendEmail({ to, subject, html });
  }

  async sendBillingReceipt(to: string, patientName: string, amount: string, date: string, paymentMethod: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = billingReceipt(patientName, amount, date, paymentMethod);
    logger.info({ template: 'billingReceipt' }, 'Sending billing receipt');
    return this.client.sendEmail({ to, subject, html });
  }

  async sendReportReady(to: string, patientName: string, reportType: string, reportLink: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = reportReady(patientName, reportType, reportLink);
    logger.info({ template: 'reportReady' }, 'Sending report ready email');
    return this.client.sendEmail({ to, subject, html });
  }

  async sendNewsletterConfirmation(to: string, email: string, confirmLink: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = newsletterConfirmation(email, confirmLink);
    logger.info({ template: 'newsletterConfirmation' }, 'Sending newsletter confirmation');
    return this.client.sendEmail({ to, subject, html });
  }

  async sendLeadMagnetDelivery(to: string, recipientName: string, magnetTitle: string, downloadLink: string): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = leadMagnetDelivery(recipientName, magnetTitle, downloadLink);
    logger.info({ template: 'leadMagnetDelivery' }, 'Sending lead magnet delivery');
    return this.client.sendEmail({ to, subject, html });
  }
}

export const emailService = new EmailService(emailClient);
