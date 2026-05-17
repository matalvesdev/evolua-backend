import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';

/**
 * Health endpoints.
 *
 * - `/healthz`  — liveness (sempre 200 se o processo respondeu).
 * - `/readyz`   — readiness shallow (DB + AI). Usar em load-balancers.
 * - `/healthz/deep` — readiness completo + diagnóstico (DB latency + AI reachable +
 *                    versão). NÃO usar em probes — apenas debugging humano.
 */

const ComponentSchema = z.object({
  status: z.enum(['up', 'down', 'degraded', 'skipped']),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});

async function probeDb(): Promise<z.infer<typeof ComponentSchema>> {
  const t0 = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'up', latencyMs: Math.round(performance.now() - t0) };
  } catch (err) {
    return { status: 'down', error: err instanceof Error ? err.message : 'unknown' };
  }
}

async function probeAi(): Promise<z.infer<typeof ComponentSchema>> {
  if (!env.AI_SERVICE_URL) return { status: 'skipped' };
  const t0 = performance.now();
  try {
    const ctrl = AbortSignal.timeout(2000);
    const res = await fetch(`${env.AI_SERVICE_URL.replace(/\/$/, '')}/healthz`, { signal: ctrl });
    if (!res.ok) return { status: 'down', error: `HTTP ${res.status}` };
    return { status: 'up', latencyMs: Math.round(performance.now() - t0) };
  } catch (err) {
    return { status: 'down', error: err instanceof Error ? err.message : 'unknown' };
  }
}

const healthRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    '/healthz',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: { 200: z.object({ status: z.literal('ok') }) },
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  route.get(
    '/readyz',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness probe — DB + AI shallow',
        response: {
          200: z.object({ status: z.literal('ready'), db: z.literal('up') }),
          503: z.object({ status: z.literal('not_ready'), db: z.enum(['up', 'down']) }),
        },
      },
    },
    async (_req, rep) => {
      const db = await probeDb();
      if (db.status !== 'up') {
        return rep.code(503).send({ status: 'not_ready' as const, db: 'down' as const });
      }
      return { status: 'ready' as const, db: 'up' as const };
    },
  );

  route.get(
    '/healthz/deep',
    {
      schema: {
        tags: ['health'],
        summary: 'Diagnóstico completo (uso humano, não probe)',
        response: {
          200: z.object({
            status: z.enum(['ok', 'degraded']),
            version: z.string(),
            uptime: z.number(),
            components: z.object({
              db: ComponentSchema,
              ai: ComponentSchema,
            }),
          }),
        },
      },
    },
    async () => {
      const [db, ai] = await Promise.all([probeDb(), probeAi()]);
      const allUp = db.status === 'up' && (ai.status === 'up' || ai.status === 'skipped');
      return {
        status: allUp ? ('ok' as const) : ('degraded' as const),
        version: process.env.npm_package_version ?? '2.0.0',
        uptime: Math.round(process.uptime()),
        components: { db, ai },
      };
    },
  );
};

export default healthRoutes;
