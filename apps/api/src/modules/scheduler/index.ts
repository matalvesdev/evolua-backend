/**
 * Scheduler Fastify plugin.
 *
 * Registers lifecycle hooks:
 * - `onReady` → starts the appointment reminder scheduler
 * - `onClose` → stops the scheduler gracefully
 */
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { startScheduler, stopScheduler } from './scheduler.service.js';

const schedulerPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onReady', () => {
    startScheduler();
    app.log.info('scheduler: appointment reminder scheduler started');
  });

  app.addHook('onClose', (_instance, done) => {
    stopScheduler();
    app.log.info('scheduler: appointment reminder scheduler stopped');
    done();
  });
};

export default fp(schedulerPlugin, {
  name: 'scheduler',
  fastify: '5.x',
});
