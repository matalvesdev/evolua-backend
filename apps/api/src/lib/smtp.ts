import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { env } from '../config/env.js';

export class SmtpClient {
  private transport: ReturnType<typeof createTransport> | null = null;

  isEnabled(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);
  }

  private getTransport() {
    if (!this.transport) {
      const opts: SMTPTransport.Options = {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER!,
          pass: env.SMTP_PASS!,
        },
      };
      this.transport = createTransport(opts);
    }
    return this.transport;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      await this.getTransport().sendMail({
        from: `"${env.SMTP_FROM_NAME ?? 'Evolua'}" <${env.SMTP_FROM}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      return { success: true };
    } catch (e) {
      this.transport = null
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

export const smtpClient = new SmtpClient();
