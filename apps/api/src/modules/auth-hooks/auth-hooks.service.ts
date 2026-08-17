import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { emailService } from '../email/email.service.js';

/**
 * Payload enviado pelo Supabase Auth HTTP Hook.
 * @see https://supabase.com/docs/guides/auth/auth-hooks
 */
interface AuthHookPayload {
  event: 'user.signup' | 'user.password_reset' | 'user.login' | 'user.token_refreshed';
  user: {
    id: string;
    email: string;
    phone?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
  redirect_to?: string;
}

interface AuthHookResponse {
  action: 'show_confirmation' | 'request_password_reset' | 'allow' | 'deny';
  redirect_to?: string;
  message?: string;
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_AUTH_HOOK_SECRET não configurado');
  }
  try {
    const hmac = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.replace(/^sha256=/, '');
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(received));
  } catch {
    return false;
  }
}

function resolvePasswordResetRedirect(candidate?: string): string {
  const fallback = new URL('/nova-senha', env.FRONTEND_URL).toString();
  if (!candidate) return fallback;

  try {
    const configuredOrigin = new URL(env.FRONTEND_URL).origin;
    const requestedUrl = new URL(candidate);
    return requestedUrl.origin === configuredOrigin ? requestedUrl.toString() : fallback;
  } catch {
    return fallback;
  }
}

export class AuthHooksService {
  verifySignature(rawBody: string, signature: string): boolean {
    return verifySignature(rawBody, signature);
  }

  async handleEvent(payload: AuthHookPayload): Promise<AuthHookResponse> {
    const { event, user } = payload;

    switch (event) {
      case 'user.signup': {
        logger.info('Auth hook: signup');

        // Envia email de boas-vindas pelo provedor configurado
        const fullName = user.user_metadata?.full_name;
        const legacyFullName = user.user_metadata?.fullName;
        const name = typeof fullName === 'string'
          ? fullName
          : typeof legacyFullName === 'string'
            ? legacyFullName
            : user.email;

        if (emailService.isEnabled()) {
          emailService
            .sendWelcome(user.email, name)
            .catch(() => logger.error('Auth hook welcome email failed'));
        }

        return {
          action: 'show_confirmation',
          message: 'Verifique seu email para confirmar o cadastro.',
        };
      }

      case 'user.password_reset': {
        logger.info('Auth hook: password reset');

        const redirectTo = resolvePasswordResetRedirect(payload.redirect_to);

        if (emailService.isEnabled()) {
          emailService
            .sendPasswordReset(user.email, redirectTo)
            .catch(() => logger.error('Auth hook password reset email failed'));
        }

        return {
          action: 'request_password_reset',
          redirect_to: redirectTo,
        };
      }

      case 'user.login':
      case 'user.token_refreshed':
        return { action: 'allow' };

      default:
        return { action: 'allow' };
    }
  }
}

export const authHooksService = new AuthHooksService();
