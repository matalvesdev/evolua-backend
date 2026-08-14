import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z.string().transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  DATABASE_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(16),

  AI_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  WHATSAPP_SERVICE_URL: z.string().url().default('http://localhost:8010'),
  INTERNAL_SERVICE_TOKEN: z.string().min(8),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  LANDING_URL: z.string().url().default('https://useevolua.com.br'),

  // Hugging Face Inference API — fallback direto quando o AI service está em cold start
  HUGGINGFACE_API_KEY: z.string().min(1).optional(),

  // HMAC para validar webhooks vindos do serviço Go (Evolution API gateway).
  // Em produção é OBRIGATÓRIO; em dev é opcional para facilitar testes locais.
  EVOLUTION_WEBHOOK_SECRET: z.string().min(16).optional(),

  // Sentry (opcional — habilita captura de exceções estruturadas)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // Resend (https://resend.com) — email transacional primário
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().default('naoresponder@useevolua.com.br'),
  RESEND_FROM_NAME: z.string().default('Evolua'),

  // SMTP fallback — usado quando Resend falha
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default('Evolua'),

  // Supabase Auth HTTP Hook — HMAC secreto para validar payloads dos hooks
  SUPABASE_AUTH_HOOK_SECRET: z.string().min(16).optional(),

  // Landing page contact form — para onde enviar notificações de novo contato
  CONTACT_NOTIFICATION_EMAIL: z.string().email().optional(),

  // Pix (geração local de QR EMV — sem provider externo)
  PIX_KEY: z.string().min(1).optional(),
  PIX_MERCHANT_NAME: z.string().min(1).max(25).default('EVOLUA CLINICA'),
  PIX_MERCHANT_CITY: z.string().min(1).max(15).default('SAO PAULO'),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  // Billing — URL pública do app (usada para success/cancel URLs do checkout)
  APP_URL: z.string().url().optional(),

  // AbacatePay (provider primário BR — PIX/Boleto)
  ABACATEPAY_API_URL: z.string().url().default('https://api.abacatepay.com/v1'),
  ABACATEPAY_API_KEY: z.string().min(1).optional(),
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(16).optional(),

  // Stripe (provider fallback internacional)
  STRIPE_API_URL: z.string().url().default('https://api.stripe.com/v1'),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(16).optional(),

  // Google Calendar Sync — serviço externo de agenda
  CALENDAR_SERVICE_URL: z.string().url().optional(),
  CALENDAR_SERVICE_TOKEN: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const env = parsed.data;
export type Env = typeof env;
