import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  clinicDayKey,
  clinicDayRange,
  clinicDayRangeEndingToday,
  DEFAULT_CLINIC_TIME_ZONE,
  startOfClinicDay,
} from '../../lib/timezone.js';

export class DashboardService {
  async getStats(clinicId: string, timeZone = DEFAULT_CLINIC_TIME_ZONE) {
    const { start: today, end: tomorrow } = clinicDayRange(new Date(), timeZone);
    const localMonth = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit',
    }).formatToParts(today);
    const year = Number(localMonth.find((part) => part.type === 'year')?.value);
    const month = Number(localMonth.find((part) => part.type === 'month')?.value);
    const monthStart = startOfClinicDay(new Date(Date.UTC(year, month - 1, 1, 12)), timeZone);

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

  async getRevenueByMonth(clinicId: string, months = 6, timeZone = DEFAULT_CLINIC_TIME_ZONE) {
    const now = new Date();
    const local = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit',
    }).formatToParts(now);
    const year = Number(local.find((part) => part.type === 'year')?.value);
    const month = Number(local.find((part) => part.type === 'month')?.value);
    const start = startOfClinicDay(new Date(Date.UTC(year, month - months + 1, 1, 12)), timeZone);

    // Postgres-specific date_trunc grouping
    const rows = await prisma.$queryRaw<
      Array<{ month: string; income: Prisma.Decimal; expense: Prisma.Decimal }>
    >`
      SELECT
        to_char(paid_at AT TIME ZONE ${timeZone}, 'YYYY-MM') AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE clinic_id = ${clinicId}::uuid
        AND deleted_at IS NULL
        AND status = 'paid'
        AND paid_at >= ${start}
      GROUP BY to_char(paid_at AT TIME ZONE ${timeZone}, 'YYYY-MM')
      ORDER BY month ASC
    `;

    return rows.map((r) => ({
      month: r.month,
      income: r.income.toString(),
      expense: r.expense.toString(),
    }));
  }
  async getAnalytics(clinicId: string, period: string, timeZone = DEFAULT_CLINIC_TIME_ZONE) {
    const intervals: Record<string, number> = { week: 7, month: 30, quarter: 90 };
    const days = intervals[period] ?? 30;
    const { start, end, keys } = clinicDayRangeEndingToday(days, new Date(), timeZone);

    const appointments = await prisma.appointment.findMany({
      where: { clinicId, deletedAt: null, dateTime: { gte: start, lt: end } },
      orderBy: { dateTime: 'asc' },
      select: { dateTime: true, status: true },
    });

    const patients = await prisma.patient.findMany({
      where: { clinicId, deletedAt: null, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const revenueRows = await prisma.$queryRaw<
      Array<{ day: string; total: Prisma.Decimal }>
    >`
      SELECT
        to_char(paid_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
        SUM(amount) AS total
      FROM transactions
      WHERE clinic_id = ${clinicId}::uuid
        AND deleted_at IS NULL
        AND type = 'income'
        AND status = 'paid'
        AND paid_at >= ${start}
        AND paid_at < ${end}
      GROUP BY to_char(paid_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')
      ORDER BY day ASC
    `;
    const revenueMap = new Map(revenueRows.map((r) => [r.day, Number(r.total)]));

    const labels = keys;
    const appointmentCounts: number[] = [];
    const newPatientCounts: number[] = [];
    const revenueValues: number[] = [];

    for (const key of keys) {
      appointmentCounts.push(
        appointments.filter((a) => clinicDayKey(a.dateTime, timeZone) === key).length,
      );
      newPatientCounts.push(
        patients.filter((p) => clinicDayKey(p.createdAt, timeZone) === key).length,
      );
      revenueValues.push(revenueMap.get(key) ?? 0);
    }

    const totalAppts = appointments.length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
    const noShow = appointments.filter((a) => a.status === 'no_show').length;

    const topProcedures = await prisma.appointment.groupBy({
      by: ['type'],
      where: { clinicId, deletedAt: null, dateTime: { gte: start, lt: end } },
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
