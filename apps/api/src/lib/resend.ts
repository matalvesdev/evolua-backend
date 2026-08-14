import { env } from '../config/env.js';
import { logger } from './logger.js';

interface ResendPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
}

export class ResendClient {
  isEnabled(): boolean {
    return Boolean(env.RESEND_API_KEY);
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const from = env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    const payload: ResendPayload = {
      from: `${env.RESEND_FROM_NAME} <${from}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    };

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          ...(params.idempotencyKey ? { 'Idempotency-Key': params.idempotencyKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      const body = await res.text();

      if (!res.ok) {
        return {
          success: false,
          error: `Resend ${res.status}: ${body.slice(0, 300)}`,
        };
      }

      return { success: true };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logger.error({ error: errorMsg }, 'Resend send failed');
      return { success: false, error: errorMsg };
    }
  }
}

export const resendClient = new ResendClient();
