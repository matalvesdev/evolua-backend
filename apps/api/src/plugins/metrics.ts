import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { timingSafeEqual } from 'node:crypto';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';
import { env, isProductionLike } from '../config/env.js';

/**
 * Métricas Prometheus.
 *
 * Expõe:
 *  - `http_requests_total{method, route, status}`
 *  - `http_request_duration_seconds{method, route, status}` (histogram)
 *  - métricas default do Node (cpu, memória, GC, event loop lag) via `collectDefaultMetrics`
 *
 * Em staging/produção, `/metrics` exige o token interno para não expor dados
 * operacionais publicamente. O endpoint continua aberto apenas em desenvolvimento.
 */

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'evolua_api_' });

const httpRequestsTotal = new Counter({
  name: 'evolua_api_http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

const httpDuration = new Histogram({
  name: 'evolua_api_http_request_duration_seconds',
  help: 'Duração de requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status'] as const,
  // Buckets ajustados ao perfil esperado (CRUD + RAG ocasional)
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const deliveryAttemptsTotal = new Counter({
  name: 'evolua_api_delivery_attempts_total',
  help: 'Tentativas de entrega por canal e resultado, sem dados de paciente',
  labelNames: ['channel', 'outcome'] as const,
  registers: [registry],
});

const transcriptionAttemptsTotal = new Counter({
  name: 'evolua_api_transcription_attempts_total',
  help: 'Resultado de transcrições clínicas, sem conteúdo ou identificadores',
  labelNames: ['outcome'] as const,
  registers: [registry],
});

export function recordDeliveryAttempt(channel: 'email' | 'whatsapp', outcome: 'sent' | 'failed'): void {
  deliveryAttemptsTotal.inc({ channel, outcome });
}

export function recordTranscriptionAttempt(outcome: 'completed' | 'failed'): void {
  transcriptionAttemptsTotal.inc({ outcome });
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Marca de tempo (em ms, monotônico) registrada em `onRequest`. */
    _metricsStart?: number;
  }
}

const metricsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req: FastifyRequest) => {
    req._metricsStart = performance.now();
  });

  app.addHook('onResponse', async (req: FastifyRequest, rep: FastifyReply) => {
    const start = req._metricsStart;
    if (start === undefined) return;
    const durationSec = (performance.now() - start) / 1000;
    // Usa routerPath quando existe (rota match) — agrupa por template, não pelo URL bruto.
    // `/metrics` e `/healthz` não geram cardinalidade infinita.
    const route = req.routeOptions?.url ?? 'unknown';
    const labels = {
      method: req.method,
      route,
      status: String(rep.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpDuration.observe(labels, durationSec);
  });

  app.get('/metrics', { schema: { hide: true } }, async (req, rep) => {
    if (isProductionLike && !hasValidInternalToken(req.headers['x-internal-token'])) {
      return rep.code(404).send();
    }
    rep.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
};

function hasValidInternalToken(value: string | string[] | undefined): boolean {
  if (typeof value !== 'string' || !env.INTERNAL_SERVICE_TOKEN) return false;
  const expected = Buffer.from(env.INTERNAL_SERVICE_TOKEN);
  const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export default fp(metricsPlugin, { name: 'metrics' });
