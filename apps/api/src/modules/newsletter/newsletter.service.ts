import { env } from '../../config/env.js';

export interface SubscribeResult {
  success: boolean;
  error?: string;
}

export interface UnsubscribeResult {
  success: boolean;
  error?: string;
}

export class NewsletterService {
  async subscribe(email: string): Promise<SubscribeResult> {
    try {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            source: 'api-newsletter',
            status: 'active',
            unsubscribed_at: null,
          }),
        },
      );

      if (res.status === 409) {
        return { success: true };
      }

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async unsubscribe(token: string): Promise<UnsubscribeResult> {
    try {
      const query = new URLSearchParams({
        unsubscribe_token: `eq.${token}`,
        status: 'eq.active',
      });
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/newsletter_subscribers?${query.toString()}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            status: 'cancelled',
            unsubscribed_at: new Date().toISOString(),
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Supabase ${res.status}: ${text.slice(0, 200)}` };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

export const newsletterService = new NewsletterService();
