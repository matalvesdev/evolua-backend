import { describe, it, expect } from 'vitest';
import { transactionToDTO, categoryToDTO } from './finances.mapper.js';
import type { Transaction as PrismaTransaction, TransactionCategory } from '@prisma/client';

const fixedDueDate = new Date('2026-05-09T15:30:00.000Z');
const fixedPaidAt = new Date('2026-05-10T11:00:00.000Z');
const fixedCreatedAt = new Date('2026-05-08T08:00:00.000Z');

describe('transactionToDTO', () => {
  it('converte Decimal/Date para strings ISO previsíveis', () => {
    const row = {
      id: 't1', clinicId: 'c1', userId: 'u1', patientId: 'p1', appointmentId: null,
      type: 'income', category: 'session', amount: { toString: () => '199.90' },
      description: 'Sessão', status: 'paid',
      dueDate: fixedDueDate, paidAt: fixedPaidAt,
      paymentMethod: 'pix', paymentReference: 'tx-1', notes: null,
      createdAt: fixedCreatedAt, updatedAt: fixedCreatedAt,
    } as unknown as PrismaTransaction;

    const dto = transactionToDTO(row);
    expect(dto.amount).toBe('199.90');
    expect(dto.dueDate).toBe('2026-05-09');
    expect(dto.paidAt).toBe('2026-05-10T11:00:00.000Z');
    expect(dto.createdAt).toBe('2026-05-08T08:00:00.000Z');
  });

  it('paidAt null preserva null', () => {
    const row = {
      id: 't1', clinicId: 'c1', userId: null, patientId: null, appointmentId: null,
      type: 'expense', category: 'fixed', amount: { toString: () => '50.00' },
      description: 'Aluguel', status: 'pending',
      dueDate: fixedDueDate, paidAt: null,
      paymentMethod: null, paymentReference: null, notes: 'mensal',
      createdAt: fixedCreatedAt, updatedAt: fixedCreatedAt,
    } as unknown as PrismaTransaction;

    expect(transactionToDTO(row).paidAt).toBeNull();
  });
});

describe('categoryToDTO', () => {
  it('mapeia campos básicos', () => {
    const row = {
      id: 'cat1', clinicId: 'c1', name: 'Sessões',
      type: 'income', color: '#6C63FF', icon: 'star',
      isSystem: true, createdAt: fixedCreatedAt,
    } as unknown as TransactionCategory;

    const dto = categoryToDTO(row);
    expect(dto).toMatchObject({
      id: 'cat1', name: 'Sessões', isSystem: true, color: '#6C63FF',
    });
    expect(dto.createdAt).toBe('2026-05-08T08:00:00.000Z');
  });
});
