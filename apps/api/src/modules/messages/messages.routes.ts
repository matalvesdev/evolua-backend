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
        response: { 201: MessageSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const m = await messagesService.create(clinicId, req.user.id, req.body);
      return rep.code(201).send(messageMapper.toDto(m));
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
        response: { 201: z.object({ success: z.boolean(), messageId: z.string().optional() }), 404: ErrorResponseSchema, 500: ErrorResponseSchema },
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
        });
        logger.info({ messageId: message.id, channel: req.body.type }, 'messages: sent');
        return rep.code(201).send({ success: true, messageId: message.id });
      } catch (e) {
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
      return messagesService.listAutomations(clinicId);
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
      return updated;
    },
  );
};

export default messagesRoutes;
