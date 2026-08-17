import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateTransactionInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  appointment: { findFirst: vi.fn() },
  transaction: { create: vi.fn() },
};
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
const { FinancesService } = await import('./finances.service.js');

beforeEach(() => vi.clearAllMocks());

describe('FinancesService reference integrity', () => {
  it('rejects a transaction with a patient from another clinic', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);
    const input: CreateTransactionInput = {
      type: 'income', category: 'session', amount: '100.00',
      dueDate: '2026-08-17T12:00:00.000Z',
      patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
    };
    await expect(new FinancesService().create('clinic-a', 'user-a', input)).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });
});
