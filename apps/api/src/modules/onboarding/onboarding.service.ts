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

  async completeStep(
    userId: string,
    stepId: string,
    data?: Record<string, unknown>,
    completed = false,
  ): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/advance_onboarding_progress`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          p_user_id: userId,
          p_step_id: stepId,
          p_data: data ?? {},
          p_completed: completed,
        }),
      });
      if (!res.ok) {
        logger.warn({ status: res.status, stepId }, 'onboarding: patch step failed');
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      logger.warn({ err, userId, stepId }, 'onboarding: exception');
      return { success: false };
    }
  }

  async complete(userId: string): Promise<{ success: boolean }> {
    return this.completeStep(userId, 'completed', undefined, true);
  }
}

export const onboardingService = new OnboardingService();
