import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { Sentry } from '../lib/sentry.js';
import { env } from '../config/env.js';

type AnyError = Error & {
  statusCode?: number;
  code?: string;
  meta?: { target?: unknown };
};

/**
 * Error handler centralizado.
 * - ZodError → 400 com fieldErrors
 * - PrismaClientKnownRequestError P2025 → 404
 * - PrismaClientKnownRequestError P2002 → 409 (unique violation)
 * - statusCode definido → propaga
 * - resto → 500 (sem vazar stack em produção)
 */
const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err: unknown, req, rep) => {
    if (err instanceof ZodError) {
      return rep.code(400).send({
        error: 'ValidationError',
        message: 'Invalid request payload',
        details: err.flatten().fieldErrors,
      });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return rep.code(404).send({ error: 'NotFound', message: 'Resource not found' });
      }
      if (err.code === 'P2002') {
        return rep.code(409).send({
          error: 'Conflict',
          message: 'A record with this identifier already exists',
        });
      }
    }

    const e = err as AnyError;
    if (e.statusCode && e.statusCode < 500) {
      return rep.code(e.statusCode).send({
        error: e.name ?? 'BadRequest',
        message: e.message,
      });
    }

    req.log.error({ err: e }, 'Unhandled error');
    // Captura no Sentry apenas erros 5xx / não-classificados — 4xx são
    // ruído (cliente fez request inválido).
    Sentry.captureException(e, {
      extra: {
        url: req.url,
        method: req.method,
        requestId: req.id,
      },
    });
    return rep.code(500).send({
      error: 'InternalServerError',
      message: env.NODE_ENV === 'production' ? 'Something went wrong' : e.message,
    });
  });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });
