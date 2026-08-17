import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { dashboardService } from './dashboard.service.js';
import { resolveClinicId, resolveClinicTimeZone } from '../auth/auth.helpers.js';
import { prisma } from '../../lib/prisma.js';

const DashboardHomeSchema = z.object({
  stats: z.object({
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
  }),
  todayAppointments: z.array(z.object({
    id: z.string(),
    patientId: z.string(),
    patientName: z.string(),
    therapistName: z.string(),
    dateTime: z.string(),
    duration: z.number(),
    type: z.string(),
    status: z.string(),
  })),
  pendingTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    priority: z.string(),
    status: z.string(),
    dueDate: z.string().nullable(),
  })),
});

const dashboardHomeRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/home',
    {
      schema: { tags: ['dashboard'], response: { 200: DashboardHomeSchema } },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const timeZone = await resolveClinicTimeZone(req.user.id);

      const [stats, todayAppointments, pendingTasks] = await Promise.all([
        dashboardService.getStats(clinicId, timeZone),
        dashboardService.getUpcomingAppointments(clinicId, 5),
        prisma.task.findMany({
          where: { clinicId, status: 'pending' },
          orderBy: { dueDate: 'asc' },
          take: 8,
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            dueDate: true,
          },
        }),
      ]);

      return {
        stats,
        todayAppointments,
        pendingTasks: pendingTasks.map((t) => ({
          ...t,
          dueDate: t.dueDate?.toISOString() ?? null,
        })),
      };
    },
  );
};

export default dashboardHomeRoutes;
