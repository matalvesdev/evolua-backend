import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { blogService } from './blog.service.js';

const ArticleSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable().default(''),
  category: z.string(),
  image: z.string().nullable().default(''),
  date: z.string().nullable().default(''),
  readTime: z.number(),
  author: z.string(),
  content: z.string(),
  featured: z.boolean(),
});

const blogRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get('/posts', {
    schema: {
      tags: ['blog'],
      summary: 'List published blog posts (public)',
      querystring: z.object({
        category: z.string().optional(),
      }),
      response: {
        200: z.array(ArticleSchema),
      },
    },
  }, async (req) => {
    const { category } = req.query;
    return blogService.list(category);
  });
};

export default blogRoutes;
