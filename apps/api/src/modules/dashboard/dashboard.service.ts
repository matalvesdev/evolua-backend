import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export class DashboardService {
  async getStats(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      activePatients,
      totalPatients,
      todayAppointments,
      monthAppointments,
      pendingTasks,
      monthIncome,
      monthExpense,
      pendingTransactions,
      draftReports,
    ] = await Promise.all([
      prisma.patient.count({ where: { clinicId, deletedAt: null, status: 'active' } }),
      prisma.patient.count({ where: { clinicId, deletedAt: null } }),
      prisma.appointment.count({
        where: {
          clinicId,
          deletedAt: null,
          dateTime: { gte: today, lt: tomorrow },
          status: { notIn: ['cancelled', 'no_show'] },
        },
      }),
      prisma.appointment.count({
        where: { clinicId, deletedAt: null, dateTime: { gte: monthStart } },
      }),
      prisma.task.count({ where: { clinicId, status: 'pending' } }),
      prisma.transaction.aggregate({
        where: {
          clinicId,
          deletedAt: null,
          type: 'income',
          status: 'paid',
          paidAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          clinicId,
          deletedAt: null,
          type: 'expense',
          status: 'paid',
          paidAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: { clinicId, deletedAt: null, status: 'pending' },
      }),
      prisma.report.count({ where: { clinicId, deletedAt: null, status: 'draft' } }),
    ]);

    const income = monthIncome._sum.amount ?? new Prisma.Decimal(0);
    const expense = monthExpense._sum.amount ?? new Prisma.Decimal(0);

    return {
      patients: {
        active: activePatients,
        total: totalPatients,
      },
      appointments: {
        today: todayAppointments,
        month: monthAppointments,
      },
      tasks: {
        pending: pendingTasks,
      },
      finances: {
        monthIncome: income.toString(),
        monthExpense: expense.toString(),
        monthBalance: income.minus(expense).toString(),
        pendingCount: pendingTransactions,
      },
      reports: {
        drafts: draftReports,
      },
    };
  }

  async getUpcomingAppointments(clinicId: string, limit = 10) {
    const now = new Date();
    const rows = await prisma.appointment.findMany({
      where: {
        clinicId,
        deletedAt: null,
        dateTime: { gte: now },
        status: { notIn: ['cancelled', 'no_show', 'completed'] },
      },
      orderBy: { dateTime: 'asc' },
      take: limit,
    });
    return rows.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      patientName: a.patientName,
      therapistName: a.therapistName,
      dateTime: a.dateTime.toISOString(),
      duration: a.duration,
      type: a.type,
      status: a.status,
    }));
  }

  async getRevenueByMonth(clinicId: string, months = 6) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Postgres-specific date_trunc grouping
    const rows = await prisma.$queryRaw<
      Array<{ month: Date; income: Prisma.Decimal; expense: Prisma.Decimal }>
    >`
      SELECT
        date_trunc('month', paid_at) AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE clinic_id = ${clinicId}::uuid
        AND deleted_at IS NULL
        AND status = 'paid'
        AND paid_at >= ${start}
      GROUP BY date_trunc('month', paid_at)
      ORDER BY month ASC
    `;

    return rows.map((r) => ({
      month: r.month.toISOString().slice(0, 7),
      income: r.income.toString(),
      expense: r.expense.toString(),
    }));
  }
  async getAnalytics(clinicId: string, period: string) {
    const now = new Date();
    const intervals: Record<string, number> = { week: 7, month: 30, quarter: 90 };
    const days = intervals[period] ?? 30;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

    const appointments = await prisma.appointment.findMany({
      where: { clinicId, deletedAt: null, dateTime: { gte: start } },
      orderBy: { dateTime: 'asc' },
      select: { dateTime: true, status: true },
    });

    const patients = await prisma.patient.findMany({
      where: { clinicId, deletedAt: null, createdAt: { gte: start } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const revenueRows = await prisma.$queryRaw<
      Array<{ day: string; total: Prisma.Decimal }>
    >`
      SELECT
        to_char(paid_at, 'YYYY-MM-DD') AS day,
        SUM(amount) AS total
      FROM transactions
      WHERE clinic_id = ${clinicId}::uuid
        AND deleted_at IS NULL
        AND type = 'income'
        AND status = 'paid'
        AND paid_at >= ${start}
      GROUP BY to_char(paid_at, 'YYYY-MM-DD')
      ORDER BY day ASC
    `;
    const revenueMap = new Map(revenueRows.map((r) => [r.day, Number(r.total)]));

    const labels: string[] = [];
    const appointmentCounts: number[] = [];
    const newPatientCounts: number[] = [];
    const revenueValues: number[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      appointmentCounts.push(
        appointments.filter((a) => a.dateTime.toISOString().slice(0, 10) === key).length,
      );
      newPatientCounts.push(
        patients.filter((p) => p.createdAt.toISOString().slice(0, 10) === key).length,
      );
      revenueValues.push(revenueMap.get(key) ?? 0);
    }

    const totalAppts = appointments.length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
    const noShow = appointments.filter((a) => a.status === 'no_show').length;

    const topProcedures = await prisma.appointment.groupBy({
      by: ['type'],
      where: { clinicId, deletedAt: null, dateTime: { gte: start } },
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
      take: 5,
    });

    return {
      revenue: { labels, values: revenueValues },
      appointments: { labels, values: appointmentCounts },
      newPatients: { labels, values: newPatientCounts },
      topProcedures: topProcedures.map((p) => ({ name: p.type, count: p._count.type })),
      cancellationRate: totalAppts > 0 ? cancelled / totalAppts : 0,
      noShowRate: totalAppts > 0 ? noShow / totalAppts : 0,
    };
  }
}

export const dashboardService = new DashboardService();
