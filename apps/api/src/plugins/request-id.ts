import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';

/**
 * Request-ID propagation.
 *
 * Aceita `x-request-id` inbound (de proxy/CDN/microserviço chamador) ou gera um UUID.
 * Anexa em `req.id` (já usado por pino) e ecoa no response como `x-request-id`.
 *
 * Permite correlacionar logs cross-service (api ↔ ai ↔ whatsapp).
 *
 * Aceita apenas IDs entre 8 e 128 chars (caractere imprimível seguro).
 * Mitiga injeção de log poison via header malicioso.
 */
const REQ_ID_HEADER = 'x-request-id';
const SAFE_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;

const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req, rep) => {
    const incoming = req.headers[REQ_ID_HEADER];
    const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
    const id = candidate && SAFE_ID_RE.test(candidate) ? candidate : randomUUID();
    // pino usa req.id automaticamente; sobrescrevemos para refletir o header
    (req as { id: string }).id = id;
    rep.header(REQ_ID_HEADER, id);
  });
};

export default fp(requestIdPlugin, { name: 'request-id' });
