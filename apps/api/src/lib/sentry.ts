/**
 * Sentry — captura de exceções estruturadas para o serviço Fastify.
 *
 * Inicializado no boot (server.ts) ANTES de qualquer outra coisa para
 * que `Sentry.init` consiga instrumentar `http`, `undici`, etc. via
 * auto-instrumentation.
 *
 * Se SENTRY_DSN não estiver configurado, o módulo vira um no-op — ideal
 * para dev local. Em produção, o operador deve garantir o DSN no env.
 */
import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    // Não enviamos PII por padrão — clínicas lidam com dados sensíveis (LGPD).
    sendDefaultPii: false,
    // Filtra dados antes de enviar — defesa adicional caso algum log
    // acidentalmente inclua e-mail, telefone, CPF.
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user?.email) event.user.email = '[redacted]';
      return event;
    },
  });

  initialized = true;
}

export { Sentry };
