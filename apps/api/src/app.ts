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
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import patientsRoutes from './modules/patients/patients.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import financesRoutes from './modules/finances/finances.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import treatmentPlansRoutes from './modules/treatment-plans/treatment-plans.routes.js';
import patientGoalsRoutes from './modules/patient-goals/patient-goals.routes.js';
import clinicalProtocolsRoutes from './modules/clinical-protocols/clinical-protocols.routes.js';
import exercisesRoutes from './modules/exercises/exercises.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import patientPortalRoutes from './modules/patient-portal/patient-portal.routes.js';
import messagesRoutes from './modules/messages/messages.routes.js';
import audioRoutes from './modules/audio/audio.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import waCrmRoutes from './modules/wa-crm/wa-crm.routes.js';
import consentRoutes from './modules/consent/consent.routes.js';
import caaRoutes from './modules/caa/caa.routes.js';
import materialsRoutes from './modules/materials/materials.routes.js';
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

  // Plugins core
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
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
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
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Auth + error handler
  await app.register(authPlugin);
  await app.register(errorHandler);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(patientsRoutes, { prefix: '/api/patients' });
  await app.register(appointmentsRoutes, { prefix: '/api/appointments' });
  await app.register(reportsRoutes, { prefix: '/api/reports' });
  await app.register(tasksRoutes, { prefix: '/api/tasks' });
  await app.register(financesRoutes, { prefix: '/api/finances' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(treatmentPlansRoutes, { prefix: '/api/treatment-plans' });
  await app.register(patientGoalsRoutes, { prefix: '/api/goals' });
  await app.register(clinicalProtocolsRoutes, { prefix: '/api/clinical-protocols' });
  await app.register(exercisesRoutes, { prefix: '/api/exercises' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(patientPortalRoutes, { prefix: '/api/portal' });
  await app.register(messagesRoutes, { prefix: '/api/messages' });
  await app.register(audioRoutes, { prefix: '/api/audio' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(waCrmRoutes, { prefix: '/api/wa-crm' });
  await app.register(consentRoutes, { prefix: '/api/consent' });
  await app.register(caaRoutes, { prefix: '/api/caa' });
  await app.register(materialsRoutes, { prefix: '/api/materials' });
  await app.register(billingRoutes, { prefix: '/api/billing' });

  // Webhooks de billing — contexto encapsulado com parser raw-string para validar HMAC.
  // O parser só vale dentro deste escopo; demais rotas continuam recebendo JSON parseado.
  await app.register(async (instance) => {
    instance.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      (_req, body, done) => done(null, body),
    );
    await instance.register(billingWebhookRoutes);
  }, { prefix: '/webhooks' });

  return app;
}
