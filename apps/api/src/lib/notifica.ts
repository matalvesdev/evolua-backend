/**
 * Cliente HTTP para Notifica (https://docs.usenotifica.com.br).
 * Canal email transacional usando a API REST v1.
 */
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { smtpClient } from './smtp.js';
import { resendClient } from './resend.js';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  /** Chave de idempotência. Se omitida, gera UUID v4. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  notificationId?: string;
  status?: string;
  error?: string;
}

export class NotificaClient {
  isEnabled(): boolean {
    return Boolean(env.NOTIFICA_API_KEY && env.NOTIFICA_FROM_EMAIL);
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    // 1. Resend (primário)
    if (resendClient.isEnabled()) {
      const resendResult = await resendClient.sendEmail({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (resendResult.success) return { success: true };
      logger.warn({ error: resendResult.error }, 'Resend failed, trying Notifica');
    }

    // 2. Notifica (fallback 1)
    if (env.NOTIFICA_API_KEY) {
      const from = params.from ?? env.NOTIFICA_FROM_EMAIL;
      if (from) {
        const body = {
          channel: 'email',
          recipient: params.to,
          payload: {
            from,
            subject: params.subject,
            html_body: params.html,
            text_body: params.text ?? stripHtml(params.html),
          },
        };

        try {
          const res = await fetch(`${env.NOTIFICA_API_URL.replace(/\/$/, '')}/notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.NOTIFICA_API_KEY}`,
              'Idempotency-Key': params.idempotencyKey ?? randomUUID(),
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15_000),
          });

          const text = await res.text();
          if (res.ok) {
            try {
              const data = JSON.parse(text) as { id?: string; status?: string };
              return { success: true, notificationId: data.id, status: data.status ?? 'pending' };
            } catch {
              return { success: true, status: 'pending' };
            }
          }
          logger.warn({ error: `Notifica ${res.status}: ${text.slice(0, 200)}` }, 'Notifica failed');
        } catch (e) {
          logger.warn({ error: e instanceof Error ? e.message : String(e) }, 'Notifica fetch failed');
        }
      }
    }

    // 3. SMTP (fallback 2)
    if (smtpClient.isEnabled()) {
      const smtpResult = await smtpClient.sendEmail({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (smtpResult.success) return { success: true };
      return { success: false, error: `Resend + Notifica + SMTP: ${smtpResult.error}` };
    }

    return { success: false, error: 'No email provider configured (set RESEND_API_KEY, NOTIFICA_API_KEY, or SMTP_HOST)' };
  }
}

export const notificaClient = new NotificaClient();

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
