import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import metricsPlugin from './metrics.js';

/**
 * Plugin metrics — expõe `/metrics` em formato Prometheus e instrumenta
 * todas as requisições (counter + histogram).
 *
 * IMPORTANTE: o `Registry` do prom-client é módulo-singleton dentro do
 * plugin. Os testes verificam que:
 *  - `/metrics` retorna content-type prometheus-compatível
 *  - métricas custom e default aparecem no payload
 *  - requisições incrementam contadores com labels corretos
 *  - rotas inexistentes não explodem cardinalidade (route="unknown")
 */

async function buildApp() {
  const app = Fastify();
  await app.register(metricsPlugin);
  app.get('/ping', async () => ({ ok: true }));
  app.get('/error', async () => {
    throw new Error('boom');
  });
  return app;
}

describe('metrics plugin', () => {
  it('expõe /metrics com content-type prometheus', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.headers['content-type']).toMatch(/version=/);
    await app.close();
  });

  it('inclui métricas default do Node (process_*)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toMatch(/evolua_api_process_cpu_user_seconds_total/);
    expect(res.body).toMatch(/evolua_api_nodejs_eventloop_lag_seconds/);
    await app.close();
  });

  it('inclui counter e histogram custom', async () => {
    const app = await buildApp();
    // dispara uma req para garantir observação
    await app.inject({ method: 'GET', url: '/ping' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toMatch(/evolua_api_http_requests_total/);
    expect(res.body).toMatch(/evolua_api_http_request_duration_seconds/);
    await app.close();
  });

  it('incrementa counter com labels method/route/status', async () => {
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/ping' });
    await app.inject({ method: 'GET', url: '/ping' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    // Esperamos pelo menos 2 hits em GET /ping com status 200
    const re =
      /evolua_api_http_requests_total\{method="GET",route="\/ping",status="200"\}\s+(\d+(?:\.\d+)?)/;
    const match = res.body.match(re);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(2);
    await app.close();
  });

  it('observa histogram (count > 0 após requisição)', async () => {
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/ping' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    const re =
      /evolua_api_http_request_duration_seconds_count\{method="GET",route="\/ping",status="200"\}\s+(\d+)/;
    const match = res.body.match(re);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(0);
    await app.close();
  });

  it('agrupa rotas inexistentes como route="unknown" (sem cardinalidade infinita)', async () => {
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/this-does-not-exist' });
    await app.inject({ method: 'GET', url: '/another-404-path' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    // 404s devem agregar sob route="unknown" (ou similar). Nunca devem aparecer
    // os paths brutos como labels — isso explodiria cardinalidade.
    expect(res.body).not.toMatch(/route="\/this-does-not-exist"/);
    expect(res.body).not.toMatch(/route="\/another-404-path"/);
    await app.close();
  });

  it('registra status 5xx para handlers que lançam', async () => {
    const app = await buildApp();
    const r = await app.inject({ method: 'GET', url: '/error' });
    expect(r.statusCode).toBe(500);
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toMatch(
      /evolua_api_http_requests_total\{method="GET",route="\/error",status="500"\}/,
    );
    await app.close();
  });
});
