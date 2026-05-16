import type {
  Transaction as PrismaTransaction,
  TransactionCategory as PrismaCategory,
} from '@prisma/client';
import type { Transaction, TransactionCategory } from '@evolua/contracts';

export function transactionToDTO(t: PrismaTransaction): Transaction {
  return {
    id: t.id,
    clinicId: t.clinicId,
    userId: t.userId,
    patientId: t.patientId,
    appointmentId: t.appointmentId,
    type: t.type,
    category: t.category,
    amount: t.amount.toString(),
    description: t.description,
    status: t.status,
    dueDate: t.dueDate.toISOString().slice(0, 10),
    paidAt: t.paidAt?.toISOString() ?? null,
    paymentMethod: t.paymentMethod,
    paymentReference: t.paymentReference,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function categoryToDTO(c: PrismaCategory): TransactionCategory {
  return {
    id: c.id,
    clinicId: c.clinicId,
    name: c.name,
    type: c.type,
    color: c.color,
    icon: c.icon,
    isSystem: c.isSystem,
    createdAt: c.createdAt.toISOString(),
  };
}
