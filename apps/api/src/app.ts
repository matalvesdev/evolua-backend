import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';

import { env } from './config/env.js';
import authPlugin from './plugins/auth.js';
import errorHandler from './plugins/error-handler.js';
import requestIdPlugin from './plugins/request-id.js';
import metricsPlugin from './plugins/metrics.js';

// Critical modules — synchronous imports (loaded at startup)
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import patientsRoutes from './modules/patients/patients.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import { billingRoutes, billingWebhookRoutes } from './modules/billing/billing.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
      }),
      // Inclui requestId em todos os logs (preenchido pelo plugin request-id)
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
        }),
      },
    },
    disableRequestLogging: false,
    trustProxy: true,
    // Permite que o plugin request-id sobrescreva via header inbound
    genReqId: () => 'pending',
  });

  // Zod como validator + serializer
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins core — CORS PRIMEIRO para garantir headers em todas as respostas
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-token', 'x-user-id'],
  });
  await app.register(requestIdPlugin);
  await app.register(metricsPlugin);
  await app.register(sensible);
  // Helmet — CSP relaxado em dev (Swagger UI usa inline scripts/styles).
  // Em produção, mantemos CSP padrão do helmet (sem inline) e ajustamos directives.
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production'
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
            fontSrc: ["'self'", 'data:'],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false, // permite Swagger UI carregar fontes externas
    hsts: env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  });
  await app.register(compress);
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });

  // OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Evolua API',
        description: 'API principal do Evolua CRM (Fastify + Prisma + Zod)',
        version: '2.0.0',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });
  if (env.NODE_ENV !== 'production') {
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  // Auth + error handler
  await app.register(authPlugin);
  await app.register(errorHandler);

  // Critical routes — synchronous registration
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(patientsRoutes, { prefix: '/api/patients' });
  await app.register(appointmentsRoutes, { prefix: '/api/appointments' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(billingRoutes, { prefix: '/api/billing' });

  // Billing webhooks — contexto encapsulado com parser raw-string para validar HMAC.
  // O parser só vale dentro deste escopo; demais rotas continuam recebendo JSON parseado.
  await app.register(async (instance) => {
    instance.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      (_req, body, done) => done(null, body),
    );
    await instance.register(billingWebhookRoutes);
  }, { prefix: '/hooks' });

  // Non-critical modules — lazy-loaded after startup via dynamic imports
  // This reduces cold start time by deferring ~30 route modules
  app.addHook('onReady', async () => {
    const lazyModules = [
      { import: () => import('./modules/reports/reports.routes.js'), prefix: '/api/reports' },
      { import: () => import('./modules/tasks/tasks.routes.js'), prefix: '/api/tasks' },
      { import: () => import('./modules/finances/finances.routes.js'), prefix: '/api/finances' },
      { import: () => import('./modules/notifications/notifications.routes.js'), prefix: '/api/notifications' },
      { import: () => import('./modules/treatment-plans/treatment-plans.routes.js'), prefix: '/api/treatment-plans' },
      { import: () => import('./modules/patient-goals/patient-goals.routes.js'), prefix: '/api/goals' },
      { import: () => import('./modules/clinical-protocols/clinical-protocols.routes.js'), prefix: '/api/clinical-protocols' },
      { import: () => import('./modules/exercises/exercises.routes.js'), prefix: '/api/exercises' },
      { import: () => import('./modules/patient-portal/patient-portal.routes.js'), prefix: '/api/portal' },
      { import: () => import('./modules/messages/messages.routes.js'), prefix: '/api/messages' },
      { import: () => import('./modules/audio/audio.routes.js'), prefix: '/api/audio' },
      { import: () => import('./modules/ai/ai.routes.js'), prefix: '/api/ai' },
      { import: () => import('./modules/wa-crm/wa-crm.routes.js'), prefix: '/api/wa-crm' },
      { import: () => import('./modules/consent/consent.routes.js'), prefix: '/api/consent' },
      { import: () => import('./modules/caa/caa.routes.js'), prefix: '/api/caa' },
      { import: () => import('./modules/materials/materials.routes.js'), prefix: '/api/materials' },
      { import: () => import('./modules/auth-hooks/auth-hooks.routes.js'), prefix: '/hooks' },
      { import: () => import('./modules/email/email.routes.js'), prefix: '/api/email' },
      { import: () => import('./modules/newsletter/newsletter.routes.js'), prefix: '/api/newsletter' },
      { import: () => import('./modules/contact/contact.routes.js'), prefix: '/api/contact' },
      { import: () => import('./modules/onboarding/onboarding.routes.js'), prefix: '/api/onboarding' },
      { import: () => import('./modules/leads/leads.routes.js'), prefix: '/api/leads' },
      { import: () => import('./modules/documents/documents.routes.js'), prefix: '/api/documents' },
      { import: () => import('./modules/settings/settings.routes.js'), prefix: '/api/settings' },
      { import: () => import('./modules/scheduler/index.js'), prefix: '/api/scheduler' },
      { import: () => import('./modules/articles/articles.routes.js'), prefix: '/api/articles' },
      { import: () => import('./modules/blog/blog.routes.js'), prefix: '/api/blog' },
      { import: () => import('./modules/document-templates/document-templates.routes.js'), prefix: '/api/document-templates' },
      { import: () => import('./modules/clinical-scales/clinical-scales.routes.js'), prefix: '/api/clinical-scales' },
      { import: () => import('./modules/teleconsulta/teleconsulta.routes.js'), prefix: '/api/teleconsulta' },
    ];
    for (const mod of lazyModules) {
      const m = await mod.import();
      await app.register(m.default, { prefix: mod.prefix });
    }
  });

  return app;
}
