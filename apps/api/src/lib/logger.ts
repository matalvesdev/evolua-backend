/**
 * Logger compartilhado para uso fora do ciclo de request (services,
 * background jobs, módulos auxiliares).
 *
 * Dentro de handlers, sempre prefira `req.log` — ele já vem com `reqId`
 * e contexto da request. Use este logger apenas onde `req` não está
 * disponível (ex: inicialização, jobs, services chamados sem request).
 */
import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  }),
  base: { service: 'api' },
});
