import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import requestIdPlugin from './request-id.js';

/**
 * Plugin request-id — propaga `x-request-id` inbound (validado) ou gera UUID.
 * Crítico para correlação cross-service. Testes cobrem:
 *  - geração quando ausente
 *  - aceitação quando válido
 *  - rejeição/regeneração quando malformado (anti-injection)
 *  - eco no response header
 *  - sobrescrita do `req.id` (consumido pelo pino)
 */

async function buildApp() {
  const app = Fastify();
  await app.register(requestIdPlugin);
  app.get('/', async (req) => ({ id: req.id }));
  return app;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('request-id plugin', () => {
  it('gera UUID quando header ausente', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/' });
    const headerId = res.headers['x-request-id'];
    expect(typeof headerId).toBe('string');
    expect(UUID_RE.test(headerId as string)).toBe(true);
    const body = res.json() as { id: string };
    expect(body.id).toBe(headerId);
    await app.close();
  });

  it('aceita header válido (alfanumérico, 8-128 chars)', async () => {
    const app = await buildApp();
    const incoming = 'req_abc-123_XYZ';
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-request-id': incoming },
    });
    expect(res.headers['x-request-id']).toBe(incoming);
    expect((res.json() as { id: string }).id).toBe(incoming);
    await app.close();
  });

  it('rejeita header com chars inválidos e gera UUID', async () => {
    const app = await buildApp();
    const malicious = 'evil id with spaces';
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-request-id': malicious },
    });
    const headerId = res.headers['x-request-id'] as string;
    expect(headerId).not.toBe(malicious);
    expect(UUID_RE.test(headerId)).toBe(true);
    await app.close();
  });

  it('rejeita header curto demais (<8 chars)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-request-id': 'short' },
    });
    expect(res.headers['x-request-id']).not.toBe('short');
    expect(UUID_RE.test(res.headers['x-request-id'] as string)).toBe(true);
    await app.close();
  });

  it('rejeita header longo demais (>128 chars)', async () => {
    const app = await buildApp();
    const huge = 'a'.repeat(129);
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-request-id': huge },
    });
    expect(res.headers['x-request-id']).not.toBe(huge);
    expect(UUID_RE.test(res.headers['x-request-id'] as string)).toBe(true);
    await app.close();
  });

  it('rejeita tentativa de log injection com newlines/CRLF', async () => {
    const app = await buildApp();
    const injected = 'abc12345\r\nFAKE_LOG_LINE';
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-request-id': injected },
    });
    expect(res.headers['x-request-id']).not.toBe(injected);
    expect(UUID_RE.test(res.headers['x-request-id'] as string)).toBe(true);
    await app.close();
  });
});
