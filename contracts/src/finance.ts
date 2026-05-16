import { z } from 'zod';
import { UuidSchema } from './common.js';

export const TransactionTypeSchema = z.enum(['income', 'expense']);
export const TransactionStatusSchema = z.enum(['pending', 'paid', 'overdue', 'cancelled']);
export const PaymentMethodSchema = z.enum([
  'cash',
  'pix',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'insurance',
  'other',
]);

export const TransactionSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  userId: UuidSchema,
  patientId: UuidSchema.nullable(),
  appointmentId: UuidSchema.nullable(),
  type: z.string(),
  category: z.string(),
  amount: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  dueDate: z.string(),
  paidAt: z.string().datetime().nullable(),
  paymentMethod: z.string().nullable(),
  paymentReference: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionSchema = z.object({
  type: TransactionTypeSchema,
  category: z.string().min(1).max(100),
  amount: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d{1,2})?$/)]),
  description: z.string().max(500).optional().nullable(),
  dueDate: z.string(),
  patientId: UuidSchema.optional().nullable(),
  appointmentId: UuidSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = CreateTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export const PayTransactionSchema = z.object({
  paymentMethod: PaymentMethodSchema,
  paymentReference: z.string().max(200).optional().nullable(),
  paidAt: z.string().datetime().optional(),
});
export type PayTransactionInput = z.infer<typeof PayTransactionSchema>;

export const ListTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusSchema.optional(),
  category: z.string().optional(),
  patientId: UuidSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;

export const TransactionCategorySchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  name: z.string(),
  type: z.string(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  isSystem: z.boolean().nullable(),
  createdAt: z.string().datetime(),
});
export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;

export const CreateTransactionCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: TransactionTypeSchema,
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
});
export type CreateTransactionCategoryInput = z.infer<typeof CreateTransactionCategorySchema>;
