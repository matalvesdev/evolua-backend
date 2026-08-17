import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  CreateMessageSchema,
  ListMessagesQuerySchema,
  MessageSchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { messagesService } from './messages.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { messageMapper } from './messages.mapper.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const messagesRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.post(
    '/',
    {
      schema: {
        tags: ['messages'],
        body: CreateMessageSchema,
        response: {
          201: MessageSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      try {
        const clinicId = await resolveClinicId(req.user.id);
        const m = await messagesService.create(
          clinicId,
          req.user.id,
          req.body,
          parseIdempotencyKey(req.headers['idempotency-key']),
        );
        return rep.code(201).send(messageMapper.toDto(m));
      } catch (error) {
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
          return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
        }
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 400) {
          return rep.code(400).send({ error: 'BadRequest', message: error.message });
        }
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 409) {
          return rep.code(409).send({ error: 'Conflict', message: error.message });
        }
        throw error;
      }
    },
  );

  route.get(
    '/',
    {
      schema: {
        tags: ['messages'],
        querystring: ListMessagesQuerySchema,
        response: { 200: PaginatedResponseSchema(MessageSchema) },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await messagesService.list(clinicId, req.query);
      return { data: r.data.map(messageMapper.toDto), pagination: r.pagination };
    },
  );

  // ── Send ────────────────────────────────────────────────────────────────

  route.post(
    '/send',
    {
      schema: {
        tags: ['messages'],
        body: z.object({
          patientId: UuidSchema,
          text: z.string().min(1).max(10000),
          type: z.enum(['whatsapp', 'sms', 'email']).default('whatsapp'),
        }),
        response: {
          202: z.object({
            success: z.literal(true),
            messageId: z.string(),
            deliveryStatus: z.enum(['pending', 'processing', 'sent', 'failed']),
          }),
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      try {
        const clinicId = await resolveClinicId(req.user.id);
        const patient = await prisma.patient.findFirst({
          where: { id: req.body.patientId, clinicId, deletedAt: null },
          select: { id: true, name: true, phone: true },
        });
        if (!patient) {
          return rep.code(404).send({ error: 'NotFound', message: 'Patient not found' });
        }
        const message = await messagesService.create(clinicId, req.user.id, {
          patientId: patient.id,
          content: req.body.text,
          templateType: 'free',
          recipientName: patient.name,
          channel: req.body.type,
          recipientPhone: patient.phone ?? undefined,
        }, parseIdempotencyKey(req.headers['idempotency-key']));
        logger.info({ messageId: message.id, channel: req.body.type }, 'messages: delivery accepted');
        return rep.code(202).send({
          success: true,
          messageId: message.id,
          // A criação sempre persiste o estado pending; o dispatcher pode
          // avançar depois da resposta, mas nunca antes da aceitação.
          deliveryStatus: 'pending',
        });
      } catch (e) {
        if (e instanceof Error && 'statusCode' in e && e.statusCode === 400) {
          return rep.code(400).send({ error: 'BadRequest', message: e.message });
        }
        if (e instanceof Error && 'statusCode' in e && e.statusCode === 409) {
          return rep.code(409).send({ error: 'Conflict', message: e.message });
        }
        logger.error({ err: e }, 'messages: send error');
        return rep.code(500).send({ error: 'InternalError', message: 'Falha ao enviar mensagem' });
      }
    },
  );

  // ── WhatsApp Automations ────────────────────────────────────────────────

  const WaAutomationSchema = z.object({
    id: UuidSchema,
    clinicId: UuidSchema,
    label: z.string(),
    description: z.string().nullable(),
    trigger: z.string(),
    active: z.boolean(),
    template: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const WaAutomationUpdateSchema = z.object({
    active: z.boolean().optional(),
    label: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional().nullable(),
    template: z.string().min(1).optional(),
  });

  route.get(
    '/automations/whatsapp',
    {
      schema: {
        tags: ['messages'],
        response: { 200: z.array(WaAutomationSchema) },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const automations = await messagesService.listAutomations(clinicId);
      return automations.map((automation) => ({
        ...automation,
        createdAt: automation.createdAt.toISOString(),
        updatedAt: automation.updatedAt.toISOString(),
      }));
    },
  );

  route.patch(
    '/automations/whatsapp/:id',
    {
      schema: {
        tags: ['messages'],
        params: z.object({ id: UuidSchema }),
        body: WaAutomationUpdateSchema,
        response: {
          200: WaAutomationSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const updated = await messagesService.updateAutomation(clinicId, req.params.id, req.body);
      if (!updated) {
        return rep.code(404).send({ error: 'NotFound', message: 'Automation not found' });
      }
      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  );
};

export default messagesRoutes;

function parseIdempotencyKey(value: string | string[] | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const key = value.trim();
  if (!key) return undefined;
  if (key.length < 8 || key.length > 128) {
    const error = new Error('Idempotency-Key must contain 8 to 128 characters');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }
  return key;
}
