import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  NotificationSchema,
  ListNotificationsQuerySchema,
  NotificationPreferenceSchema,
  UpdateNotificationPreferenceSchema,
  PushSubscriptionSchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { notificationsService } from './notifications.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['notifications'],
        querystring: ListNotificationsQuerySchema,
        response: {
          200: PaginatedResponseSchema(NotificationSchema).extend({
            meta: z.object({ unreadCount: z.number() }),
          }),
        },
      },
    },
    async (req) =>
      notificationsService.list(await resolveClinicId(req.user.id), req.user.id, req.query),
  );

  route.post(
    '/:id/read',
    {
      schema: {
        tags: ['notifications'],
        params: z.object({ id: UuidSchema }),
        response: { 200: NotificationSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await notificationsService.markRead(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.params.id,
      );
      return r ?? rep.code(404).send({ error: 'NotFound', message: 'Notification not found' });
    },
  );

  route.post(
    '/read-all',
    {
      schema: {
        tags: ['notifications'],
        response: { 200: z.object({ updated: z.number() }) },
      },
    },
    async (req) =>
      notificationsService.markAllRead(await resolveClinicId(req.user.id), req.user.id),
  );

  route.get(
    '/preferences',
    {
      schema: {
        tags: ['notifications'],
        response: { 200: NotificationPreferenceSchema },
      },
    },
    async (req) =>
      notificationsService.getPreferences(await resolveClinicId(req.user.id), req.user.id),
  );

  route.patch(
    '/preferences',
    {
      schema: {
        tags: ['notifications'],
        body: UpdateNotificationPreferenceSchema,
        response: { 200: NotificationPreferenceSchema },
      },
    },
    async (req) =>
      notificationsService.updatePreferences(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.body,
      ),
  );

  route.post(
    '/push/subscribe',
    {
      schema: {
        tags: ['notifications'],
        body: PushSubscriptionSchema,
        response: { 204: z.null() },
      },
    },
    async (req, rep) => {
      await notificationsService.subscribePush(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.body,
      );
      return rep.code(204).send(null);
    },
  );

  route.post(
    '/push/unsubscribe',
    {
      schema: {
        tags: ['notifications'],
        body: z.object({ endpoint: z.string().url() }),
        response: { 204: z.null() },
      },
    },
    async (req, rep) => {
      await notificationsService.unsubscribePush(req.user.id, req.body.endpoint);
      return rep.code(204).send(null);
    },
  );
};

export default notificationsRoutes;
