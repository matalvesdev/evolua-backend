import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { dashboardService } from './dashboard.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const StatsSchema = z.object({
  patients: z.object({ active: z.number(), total: z.number() }),
  appointments: z.object({ today: z.number(), month: z.number() }),
  tasks: z.object({ pending: z.number() }),
  finances: z.object({
    monthIncome: z.string(),
    monthExpense: z.string(),
    monthBalance: z.string(),
    pendingCount: z.number(),
  }),
  reports: z.object({ drafts: z.number() }),
});

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/stats',
    {
      schema: { tags: ['dashboard'], response: { 200: StatsSchema } },
    },
    async (req) => dashboardService.getStats(await resolveClinicId(req.user.id)),
  );

  route.get(
    '/upcoming',
    {
      schema: {
        tags: ['dashboard'],
        querystring: z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              patientId: z.string(),
              patientName: z.string(),
              therapistName: z.string(),
              dateTime: z.string(),
              duration: z.number(),
              type: z.string(),
              status: z.string(),
            }),
          ),
        },
      },
    },
    async (req) =>
      dashboardService.getUpcomingAppointments(
        await resolveClinicId(req.user.id),
        req.query.limit,
      ),
  );

  route.get(
    '/revenue',
    {
      schema: {
        tags: ['dashboard'],
        querystring: z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }),
        response: {
          200: z.array(
            z.object({
              month: z.string(),
              income: z.string(),
              expense: z.string(),
            }),
          ),
        },
      },
    },
    async (req) =>
      dashboardService.getRevenueByMonth(
        await resolveClinicId(req.user.id),
        req.query.months,
      ),
  );

  // ── Analytics ───────────────────────────────────────────────────────────

  const DashboardAnalyticsSchema = z.object({
    revenue: z.object({ labels: z.array(z.string()), values: z.array(z.number()) }),
    appointments: z.object({ labels: z.array(z.string()), values: z.array(z.number()) }),
    newPatients: z.object({ labels: z.array(z.string()), values: z.array(z.number()) }),
    topProcedures: z.array(z.object({ name: z.string(), count: z.number() })),
    cancellationRate: z.number(),
    noShowRate: z.number(),
  });

  route.get(
    '/analytics',
    {
      schema: {
        tags: ['dashboard'],
        querystring: z.object({
          period: z.string().default('month'),
        }),
        response: { 200: DashboardAnalyticsSchema },
      },
    },
    async (req) =>
      dashboardService.getAnalytics(await resolveClinicId(req.user.id), req.query.period),
  );
};

export default dashboardRoutes;
