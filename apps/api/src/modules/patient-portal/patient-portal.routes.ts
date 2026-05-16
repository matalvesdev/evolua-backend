import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ErrorResponseSchema, UuidSchema } from '@evolua/contracts';
import { patientPortalService } from './patient-portal.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { env } from '../../config/env.js';
import { auditAsync } from '../../lib/audit.js';

const PublicApptSchema = z.object({
  id: z.string(),
  patientName: z.string(),
  dateTime: z.string(),
  duration: z.number(),
  type: z.string(),
  therapistName: z.string(),
  status: z.string(),
  clinicName: z.string(),
});

const patientPortalRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  // ── Interno (autenticado): gera link ─────────────────────────────────────
  route.post(
    '/appointments/:id/confirmation-link',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['patient-portal'],
        params: z.object({ id: UuidSchema }),
        response: {
          200: z.object({ link: z.string().url(), expiresAt: z.string().datetime() }),
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await patientPortalService.generateConfirmationLink(
        clinicId,
        req.params.id,
        env.FRONTEND_URL,
      );
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      auditAsync({
        clinicId, userId: req.user.id, action: 'CREATE', resource: 'AppointmentConfirmationToken',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return r;
    },
  );

  // ── Públicos (sem auth) — rate-limit agressivo ───────────────────────────
  // Audit logs nas rotas públicas usam clinicId/appointmentId resolvidos via token
  // (não há userId — paciente/responsável). User-agent e IP capturados do request.
  route.get(
    '/public/:token',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags: ['patient-portal'],
        params: z.object({ token: z.string().min(20).max(128) }),
        response: { 200: PublicApptSchema, 400: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await patientPortalService.getByToken(req.params.token);
      if ('error' in r) {
        const code = r.error === 'expired' ? 400 : 404;
        return rep
          .code(code)
          .send({ error: r.error, message: r.error === 'expired' ? 'Link expirado' : 'Link inválido' });
      }
      auditAsync({
        clinicId: r.clinicId, userId: null, action: 'PORTAL_ACCESS', resource: 'Appointment',
        resourceId: r.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      // clinicId é interno — não expor na resposta pública
      const { clinicId: _omit, ...publicView } = r;
      return publicView;
    },
  );

  route.post(
    '/public/:token/confirm',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['patient-portal'],
        params: z.object({ token: z.string().min(20).max(128) }),
        response: {
          200: z.object({ ok: z.boolean(), message: z.string() }),
          400: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const r = await patientPortalService.confirmByToken(req.params.token);
      if (r.clinicId && r.appointmentId) {
        auditAsync({
          clinicId: r.clinicId, userId: null, action: 'UPDATE', resource: 'Appointment',
          resourceId: r.appointmentId, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
          metadata: { via: 'patient-portal', action: 'confirm', success: r.ok },
        });
      }
      if (!r.ok) return rep.code(400).send({ error: 'BadRequest', message: r.message });
      return { ok: r.ok, message: r.message };
    },
  );

  route.post(
    '/public/:token/cancel',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['patient-portal'],
        params: z.object({ token: z.string().min(20).max(128) }),
        body: z.object({ reason: z.string().max(500).optional() }),
        response: {
          200: z.object({ ok: z.boolean(), message: z.string() }),
          400: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const r = await patientPortalService.cancelByToken(req.params.token, req.body.reason);
      if (r.clinicId && r.appointmentId) {
        auditAsync({
          clinicId: r.clinicId, userId: null, action: 'UPDATE', resource: 'Appointment',
          resourceId: r.appointmentId, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
          metadata: { via: 'patient-portal', action: 'cancel', success: r.ok, hasReason: Boolean(req.body.reason) },
        });
      }
      if (!r.ok) return rep.code(400).send({ error: 'BadRequest', message: r.message });
      return { ok: r.ok, message: r.message };
    },
  );
};

export default patientPortalRoutes;
