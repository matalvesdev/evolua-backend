import { env } from '../../config/env.js';

export interface SubscribeResult {
  success: boolean;
  error?: string;
}

export class NewsletterService {
  async subscribe(email: string): Promise<SubscribeResult> {
    try {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/newsletter_subscribers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ email, source: 'api-newsletter' }),
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
}

export const newsletterService = new NewsletterService();
