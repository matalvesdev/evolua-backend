import { logger } from './logger.js';
import { resendClient } from './resend.js';
import { smtpClient } from './smtp.js';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

export class EmailClient {
  isEnabled(): boolean {
    return resendClient.isEnabled() || smtpClient.isEnabled();
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (resendClient.isEnabled()) {
      const result = await resendClient.sendEmail(params);
      if (result.success) return result;
      logger.warn({ error: result.error }, 'Resend failed, trying SMTP');
    }

    if (smtpClient.isEnabled()) {
      return smtpClient.sendEmail(params);
    }

    return {
      success: false,
      error: 'No email provider configured (set RESEND_API_KEY or SMTP_HOST)',
    };
  }
}

export const emailClient = new EmailClient();
