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
}

export const dashboardService = new DashboardService();
