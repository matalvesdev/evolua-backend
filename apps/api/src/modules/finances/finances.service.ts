import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  PayTransactionInput,
  ListTransactionsQuery,
  Transaction,
  CreateTransactionCategoryInput,
} from '@evolua/contracts';
import { transactionToDTO, categoryToDTO } from './finances.mapper.js';

export class FinancesService {
  // ── Transactions ──────────────────────────────────────────────────────────
  async list(clinicId: string, q: ListTransactionsQuery) {
    const where: Prisma.TransactionWhereInput = {
      clinicId,
      deletedAt: null,
      ...(q.type && { type: q.type }),
      ...(q.status && { status: q.status }),
      ...(q.category && { category: q.category }),
      ...(q.patientId && { patientId: q.patientId }),
      ...((q.startDate || q.endDate) && {
        dueDate: {
          ...(q.startDate && { gte: new Date(q.startDate) }),
          ...(q.endDate && { lte: new Date(q.endDate) }),
        },
      }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { dueDate: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);
    return {
      data: rows.map(transactionToDTO),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
    };
  }

  async findById(clinicId: string, id: string): Promise<Transaction | null> {
    const row = await prisma.transaction.findFirst({
      where: { id, clinicId, deletedAt: null },
    });
    return row ? transactionToDTO(row) : null;
  }

  async create(
    clinicId: string,
    userId: string,
    input: CreateTransactionInput,
  ): Promise<Transaction> {
    const references = await this.resolveReferences(clinicId, input.patientId, input.appointmentId);
    const row = await prisma.transaction.create({
      data: {
        clinicId,
        userId,
        type: input.type,
        category: input.category,
        amount: new Prisma.Decimal(input.amount),
        description: input.description ?? null,
        dueDate: new Date(input.dueDate),
        patientId: references.patientId,
        appointmentId: references.appointmentId,
        notes: input.notes ?? null,
      },
    });
    return transactionToDTO(row);
  }

  async update(
    clinicId: string,
    id: string,
    input: UpdateTransactionInput,
  ): Promise<Transaction | null> {
    const exists = await prisma.transaction.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true, patientId: true, appointmentId: true },
    });
    if (!exists) return null;
    const references = await this.resolveReferences(
      clinicId,
      input.patientId === undefined ? exists.patientId : input.patientId,
      input.appointmentId === undefined ? exists.appointmentId : input.appointmentId,
    );
    const row = await prisma.transaction.update({
      where: { id },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.dueDate !== undefined && { dueDate: new Date(input.dueDate) }),
        ...(input.patientId !== undefined || input.appointmentId !== undefined ? references : {}),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
    return transactionToDTO(row);
  }

  async pay(
    clinicId: string,
    id: string,
    input: PayTransactionInput,
  ): Promise<Transaction | null> {
    const exists = await prisma.transaction.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference ?? null,
      },
    });
    return transactionToDTO(row);
  }

  async cancel(clinicId: string, id: string): Promise<Transaction | null> {
    const exists = await prisma.transaction.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.transaction.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return transactionToDTO(row);
  }

  async remove(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.transaction.findFirst({
      where: { id, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return false;
    await prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  // ── Categories ────────────────────────────────────────────────────────────
  async listCategories(clinicId: string) {
    const rows = await prisma.transactionCategory.findMany({
      where: { clinicId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return rows.map(categoryToDTO);
  }

  async createCategory(clinicId: string, input: CreateTransactionCategoryInput) {
    const row = await prisma.transactionCategory.create({
      data: {
        clinicId,
        name: input.name,
        type: input.type,
        color: input.color ?? '#6366f1',
        icon: input.icon ?? null,
      },
    });
    return categoryToDTO(row);
  }

  async deleteCategory(clinicId: string, id: string): Promise<boolean> {
    const exists = await prisma.transactionCategory.findFirst({
      where: { id, clinicId, isSystem: false },
      select: { id: true },
    });
    if (!exists) return false;
    await prisma.transactionCategory.delete({ where: { id } });
    return true;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  async summary(clinicId: string, startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = {
      clinicId,
      deletedAt: null,
      ...((startDate || endDate) && {
        dueDate: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [income, expense, pending] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: 'income', status: 'paid' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'expense', status: 'paid' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'pending' },
        _sum: { amount: true },
      }),
    ]);

    return {
      income: (income._sum.amount ?? new Prisma.Decimal(0)).toString(),
      expense: (expense._sum.amount ?? new Prisma.Decimal(0)).toString(),
      pending: (pending._sum.amount ?? new Prisma.Decimal(0)).toString(),
      balance: (
        (income._sum.amount ?? new Prisma.Decimal(0)).minus(
          expense._sum.amount ?? new Prisma.Decimal(0),
        )
      ).toString(),
    };
  }
  async getMetrics(clinicId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const rows = await prisma.$queryRaw<
      Array<{
        month: Date;
        revenue: Prisma.Decimal;
        expenses: Prisma.Decimal;
        sessions: bigint;
      }>
    >`
      SELECT
        date_trunc('month', COALESCE(paid_at, due_date)) AS month,
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END), 0) AS expenses,
        COUNT(*) FILTER (WHERE type = 'income' AND status = 'paid') AS sessions
      FROM transactions
      WHERE clinic_id = ${clinicId}::uuid
        AND deleted_at IS NULL
        AND (paid_at >= ${sixMonthsAgo} OR due_date >= ${sixMonthsAgo})
      GROUP BY date_trunc('month', COALESCE(paid_at, due_date))
      ORDER BY month ASC
    `;

    return rows.map((r) => ({
      month: r.month.toISOString().slice(0, 7),
      revenue: Number(r.revenue),
      expenses: Number(r.expenses),
      profit: Number(r.revenue) - Number(r.expenses),
      sessions: Number(r.sessions),
    }));
  }

  private async resolveReferences(clinicId: string, patientId?: string | null, appointmentId?: string | null) {
    const [patient, appointment] = await Promise.all([
      patientId ? prisma.patient.findFirst({ where: { id: patientId, clinicId, deletedAt: null }, select: { id: true } }) : Promise.resolve(null),
      appointmentId ? prisma.appointment.findFirst({ where: { id: appointmentId, clinicId, deletedAt: null }, select: { id: true, patientId: true } }) : Promise.resolve(null),
    ]);
    if ((patientId && !patient) || (appointmentId && !appointment) || (patient && appointment && patient.id !== appointment.patientId)) {
      throw Object.assign(new Error('Patient and appointment must belong to the same clinic'), { statusCode: 404 });
    }
    return { patientId: patient?.id ?? appointment?.patientId ?? null, appointmentId: appointment?.id ?? null };
  }
}

export const financesService = new FinancesService();
