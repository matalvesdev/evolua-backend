// IMPORTANTE: initSentry deve rodar ANTES de buildApp (Fastify, undici, etc.)
// para que os hooks de auto-instrumentation se anexem aos módulos certos.
import { initSentry } from './lib/sentry.js';
initSentry();

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

async function main(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Shutting down...');
    try {
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ host: '0.0.0.0', port: env.PORT });
    app.log.info(`📚 Docs: http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void main();
