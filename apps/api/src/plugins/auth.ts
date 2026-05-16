import fp from 'fastify-plugin';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

/**
 * JWT do Supabase (ES256 + JWKS).
 *
 * Supabase agora assina tokens com chave assimétrica ES256. A chave pública é
 * publicada em `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` e identificada
 * pelo `kid` no header do JWT.
 *
 * Payload típico:
 *   { sub: <uuid>, email, role: 'authenticated', aud: 'authenticated', iss, exp, iat }
 *
 * Em microservices Go/Python o Fastify atua como gateway: valida o token e
 * repassa user.id em header `x-user-id`.
 */
export type AuthUser = {
  id: string;
  email?: string;
  role?: string;
  clinicId?: string | null;
};

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
    authenticateOptional: (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
  }
}

type SupabasePayload = JWTPayload & {
  email?: string;
  role?: string;
};

const authPlugin: FastifyPluginAsync = async (app) => {
  const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL);
  const issuer = new URL('/auth/v1', env.SUPABASE_URL).toString();
  const JWKS = createRemoteJWKSet(jwksUrl, {
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
  });

  async function verifyBearer(req: FastifyRequest): Promise<AuthUser> {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      throw new Error('missing bearer token');
    }
    const token = header.slice(7).trim();
    const { payload } = await jwtVerify<SupabasePayload>(token, JWKS, {
      issuer,
      audience: 'authenticated',
    });
    if (!payload.sub) throw new Error('token missing sub');
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  app.decorate('authenticate', async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      req.user = await verifyBearer(req);
    } catch (err) {
      req.log.debug({ err: (err as Error).message }, 'jwt verify failed');
      return rep.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
  });

  app.decorate('authenticateOptional', async (req: FastifyRequest) => {
    try {
      req.user = await verifyBearer(req);
    } catch {
      // rota pública — ignora
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
