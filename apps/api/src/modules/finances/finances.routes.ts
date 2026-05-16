import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  TransactionSchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  PayTransactionSchema,
  ListTransactionsQuerySchema,
  TransactionCategorySchema,
  CreateTransactionCategorySchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { financesService } from './finances.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const notFound = { error: 'NotFound', message: 'Transaction not found' };

const financesRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  // ── Summary ─────────────────────────────────────────────────────────────
  route.get(
    '/summary',
    {
      schema: {
        tags: ['finances'],
        querystring: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
        response: {
          200: z.object({
            income: z.string(),
            expense: z.string(),
            pending: z.string(),
            balance: z.string(),
          }),
        },
      },
    },
    async (req) =>
      financesService.summary(
        await resolveClinicId(req.user.id),
        req.query.startDate,
        req.query.endDate,
      ),
  );

  // ── Categories ──────────────────────────────────────────────────────────
  route.get(
    '/categories',
    {
      schema: {
        tags: ['finances'],
        response: { 200: z.array(TransactionCategorySchema) },
      },
    },
    async (req) => financesService.listCategories(await resolveClinicId(req.user.id)),
  );

  route.post(
    '/categories',
    {
      schema: {
        tags: ['finances'],
        body: CreateTransactionCategorySchema,
        response: { 201: TransactionCategorySchema },
      },
    },
    async (req, rep) => {
      const r = await financesService.createCategory(
        await resolveClinicId(req.user.id),
        req.body,
      );
      return rep.code(201).send(r);
    },
  );

  route.delete(
    '/categories/:id',
    {
      schema: {
        tags: ['finances'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await financesService.deleteCategory(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      if (!ok) return rep.code(404).send({ error: 'NotFound', message: 'Category not found' });
      return rep.code(204).send(null);
    },
  );

  // ── Transactions ────────────────────────────────────────────────────────
  route.get(
    '/transactions',
    {
      schema: {
        tags: ['finances'],
        querystring: ListTransactionsQuerySchema,
        response: { 200: PaginatedResponseSchema(TransactionSchema) },
      },
    },
    async (req) => financesService.list(await resolveClinicId(req.user.id), req.query),
  );

  route.get(
    '/transactions/:id',
    {
      schema: {
        tags: ['finances'],
        params: z.object({ id: UuidSchema }),
        response: { 200: TransactionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await financesService.findById(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/transactions',
    {
      schema: {
        tags: ['finances'],
        body: CreateTransactionSchema,
        response: { 201: TransactionSchema },
      },
    },
    async (req, rep) => {
      const r = await financesService.create(
        await resolveClinicId(req.user.id),
        req.user.id,
        req.body,
      );
      return rep.code(201).send(r);
    },
  );

  route.patch(
    '/transactions/:id',
    {
      schema: {
        tags: ['finances'],
        params: z.object({ id: UuidSchema }),
        body: UpdateTransactionSchema,
        response: { 200: TransactionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await financesService.update(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.body,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/transactions/:id/pay',
    {
      schema: {
        tags: ['finances'],
        params: z.object({ id: UuidSchema }),
        body: PayTransactionSchema,
        response: { 200: TransactionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await financesService.pay(
        await resolveClinicId(req.user.id),
        req.params.id,
        req.body,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.post(
    '/transactions/:id/cancel',
    {
      schema: {
        tags: ['finances'],
        params: z.object({ id: UuidSchema }),
        response: { 200: TransactionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const r = await financesService.cancel(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      return r ?? rep.code(404).send(notFound);
    },
  );

  route.delete(
    '/transactions/:id',
    {
      schema: {
        tags: ['finances'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const ok = await financesService.remove(
        await resolveClinicId(req.user.id),
        req.params.id,
      );
      if (!ok) return rep.code(404).send(notFound);
      return rep.code(204).send(null);
    },
  );
};

export default financesRoutes;
