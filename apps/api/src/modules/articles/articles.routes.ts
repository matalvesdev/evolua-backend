import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { articlesService } from './articles.service.js';

const articlesRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get('/', {
    schema: {
      tags: ['articles'],
      summary: 'List published articles from therapeutic materials',
      querystring: z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(20),
      }),
      response: {
        200: z.object({
          data: z.array(z.object({
            id: z.string().uuid(),
            title: z.string(),
            excerpt: z.string().nullable(),
            category: z.string().nullable(),
            image: z.string().nullable(),
            date: z.string(),
            readTime: z.string(),
          })),
          pagination: z.object({
            page: z.number(),
            pageSize: z.number(),
            total: z.number(),
            totalPages: z.number(),
          }),
        }),
      },
    },
  }, async (req) => {
    const { page, pageSize } = req.query;
    return articlesService.list(page, pageSize);
  });
};

export default articlesRoutes;
