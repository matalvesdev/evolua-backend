import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, SearchTransactionsDto } from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Transaction, Prisma } from '@prisma/client';

@Injectable()
export class FinancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        clinicId,
        userId,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(),
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        notes: dto.notes,
      },
    });
  }

  async findAll(clinicId: string, query: SearchTransactionsDto): Promise<PaginatedResponseDto<Transaction>> {
    const where: Prisma.TransactionWhereInput = { clinicId };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.patientId) where.patientId = query.patientId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return new PaginatedResponseDto(transactions, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOne(id: string, clinicId: string): Promise<Transaction> {
    const tx = await this.prisma.transaction.findFirst({ where: { id, clinicId } });
    if (!tx) throw new NotFoundException('Transação não encontrada');
    return tx;
  }

  async update(id: string, clinicId: string, dto: UpdateTransactionDto): Promise<Transaction> {
    await this.findOne(id, clinicId);
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.category && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.status && { status: dto.status }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.paidAt && { paidAt: new Date(dto.paidAt) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(id: string, clinicId: string): Promise<void> {
    await this.findOne(id, clinicId);
    await this.prisma.transaction.delete({ where: { id } });
  }

  async getSummary(clinicId: string, startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = { clinicId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'income', status: 'completed' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'expense', status: 'completed' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalIncome: Number(income._sum.amount ?? 0),
      totalExpense: Number(expense._sum.amount ?? 0),
      balance: Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0),
    };
  }
}
