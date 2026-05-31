import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export class OnboardingService {
  private get headers() {
    return {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    };
  }

  async completeStep(userId: string, stepId: string, _data?: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/onboarding_progress?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          current_step: stepId,
          completed_steps: null,
          data: _data ?? null,
        }),
      });
      if (res.status === 404 || res.status === 0) {
        await fetch(`${env.SUPABASE_URL}/rest/v1/onboarding_progress`, {
          method: 'POST',
          headers: { ...this.headers, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            user_id: userId,
            current_step: stepId,
            completed_steps: [],
            data: _data ?? {},
            completed: false,
          }),
        });
      } else if (!res.ok) {
        logger.warn({ status: res.status, stepId }, 'onboarding: patch step failed');
      }
      return { success: true };
    } catch (err) {
      logger.warn({ err, userId, stepId }, 'onboarding: exception');
      return { success: false };
    }
  }

  async complete(userId: string): Promise<{ success: boolean }> {
    try {
      await fetch(`${env.SUPABASE_URL}/rest/v1/onboarding_progress?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ current_step: 'completed', completed: true }),
      });
      return { success: true };
    } catch (err) {
      logger.warn({ err, userId }, 'onboarding: exception on complete');
      return { success: false };
    }
  }
}

export const onboardingService = new OnboardingService();
