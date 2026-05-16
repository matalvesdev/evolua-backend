/**
 * Cliente HTTP para Notifica (https://docs.usenotifica.com.br).
 * Canal email transacional usando a API REST v1.
 */
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

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
    if (!env.NOTIFICA_API_KEY) {
      return { success: false, error: 'NOTIFICA_API_KEY não configurada' };
    }
    const from = params.from ?? env.NOTIFICA_FROM_EMAIL;
    if (!from) {
      return { success: false, error: 'NOTIFICA_FROM_EMAIL não configurada' };
    }

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
      if (!res.ok) {
        return {
          success: false,
          error: `Notifica ${res.status}: ${text.slice(0, 300)}`,
        };
      }

      try {
        const data = JSON.parse(text) as { id?: string; status?: string };
        return {
          success: true,
          notificationId: data.id,
          status: data.status ?? 'pending',
        };
      } catch {
        return { success: true, status: 'pending' };
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
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
