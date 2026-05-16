import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

/**
 * Métricas Prometheus.
 *
 * Expõe:
 *  - `http_requests_total{method, route, status}`
 *  - `http_request_duration_seconds{method, route, status}` (histogram)
 *  - métricas default do Node (cpu, memória, GC, event loop lag) via `collectDefaultMetrics`
 *
 * Endpoint `/metrics` é público (sem auth). Em produção, restringir via firewall/VPC
 * ou adicionar Basic Auth via reverse proxy. Não expor diretamente na internet.
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

  app.get('/metrics', { schema: { hide: true } }, async (_req, rep) => {
    rep.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
};

export default fp(metricsPlugin, { name: 'metrics' });
