import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { onboardingService } from './onboarding.service.js';

const paramsSchema = z.object({ stepId: z.string().min(1) });
const bodySchema = z.object({
  data: z.record(z.unknown()).optional(),
  completed: z.boolean().optional(),
});

const onboardingRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<any>();

  route.post(
    '/:stepId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['onboarding'],
        summary: 'Marcar etapa do onboarding como completa',
        params: z.object({ stepId: z.string().min(1) }),
        body: z.object({
          data: z.record(z.unknown()).optional(),
          completed: z.boolean().optional(),
        }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (req) => {
      const params = paramsSchema.parse(req.params);
      const body = bodySchema.parse(req.body);
      return onboardingService.completeStep(req.user.id, params.stepId, body.data);
    },
  );

  route.post(
    '/complete',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['onboarding'],
        summary: 'Finalizar onboarding',
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (req) => onboardingService.complete(req.user.id),
  );
};

export default onboardingRoutes;
