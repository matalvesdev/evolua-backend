import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { auditAsync } from '../../lib/audit.js';
import { UuidSchema, ErrorResponseSchema } from '@evolua/contracts';

/**
 * Consent (LGPD Art. 7º/8º).
 *
 * Endpoints append-only para registrar e revogar consentimentos.
 * Schemas locais — adicionar a `@evolua/contracts` quando estabilizar.
 */

const ConsentRecordSchema = z.object({
  id: z.string().uuid(),
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  grantedBy: z.string(),
  purpose: z.string(),
  version: z.string(),
  granted: z.boolean(),
  ipAddress: z.string().nullable(),
  grantedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
});

const GrantConsentSchema = z.object({
  patientId: z.string().uuid(),
  grantedBy: z.string().min(2),
  purpose: z.string().min(2),
  version: z.string().default('1.0'),
});

const consentRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  // GET /api/consent?patientId=...
  route.get(
    '/',
    {
      schema: {
        tags: ['consent'],
        querystring: z.object({ patientId: UuidSchema }),
        response: { 200: z.array(ConsentRecordSchema) },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const rows = await prisma.consentRecord.findMany({
        where: { clinicId, patientId: req.query.patientId },
        orderBy: { grantedAt: 'desc' },
      });
      return rows.map((r) => ({
        ...r,
        grantedAt: r.grantedAt.toISOString(),
        revokedAt: r.revokedAt?.toISOString() ?? null,
      }));
    },
  );

  // POST /api/consent — grant
  route.post(
    '/',
    {
      schema: {
        tags: ['consent'],
        body: GrantConsentSchema,
        response: { 201: ConsentRecordSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const created = await prisma.consentRecord.create({
        data: {
          clinicId,
          patientId: req.body.patientId,
          grantedBy: req.body.grantedBy,
          purpose: req.body.purpose,
          version: req.body.version,
          granted: true,
          ipAddress: req.ip,
        },
      });
      auditAsync({
        clinicId, userId: req.user.id, action: 'CONSENT_GRANT', resource: 'ConsentRecord',
        resourceId: created.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { patientId: req.body.patientId, purpose: req.body.purpose, version: req.body.version },
      });
      return rep.code(201).send({
        ...created,
        grantedAt: created.grantedAt.toISOString(),
        revokedAt: created.revokedAt?.toISOString() ?? null,
      });
    },
  );

  // POST /api/consent/:id/revoke — marca como revogado (cria nova linha não imutável,
  // mas como o schema permite revokedAt, mantemos o registro original e atualizamos
  // somente este campo. Update é restrito; pelo RLS, é bloqueado para usuários comuns
  // — apenas service_role/backend executa).
  route.post(
    '/:id/revoke',
    {
      schema: {
        tags: ['consent'],
        params: z.object({ id: UuidSchema }),
        response: { 200: ConsentRecordSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const existing = await prisma.consentRecord.findFirst({
        where: { id: req.params.id, clinicId },
      });
      if (!existing) {
        return rep.code(404).send({ error: 'NotFound', message: 'Consent record not found' });
      }
      const updated = await prisma.consentRecord.update({
        where: { id: req.params.id },
        data: { granted: false, revokedAt: new Date() },
      });
      auditAsync({
        clinicId, userId: req.user.id, action: 'CONSENT_REVOKE', resource: 'ConsentRecord',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { patientId: existing.patientId, purpose: existing.purpose },
      });
      return {
        ...updated,
        grantedAt: updated.grantedAt.toISOString(),
        revokedAt: updated.revokedAt?.toISOString() ?? null,
      };
    },
  );
};

export default consentRoutes;
