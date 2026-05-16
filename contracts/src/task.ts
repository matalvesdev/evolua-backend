import { z } from 'zod';
import { UuidSchema } from './common.js';

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const TaskTypeSchema = z.enum([
  'task',
  'follow_up',
  'documentation',
  'call',
  'meeting',
  'other',
]);

export const TaskSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  userId: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  priority: z.string(),
  status: z.string(),
  dueDate: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  patientId: UuidSchema.nullable(),
  appointmentId: UuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  type: TaskTypeSchema.default('task'),
  priority: TaskPrioritySchema.default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
  patientId: UuidSchema.optional().nullable(),
  appointmentId: UuidSchema.optional().nullable(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.extend({
  status: TaskStatusSchema,
}).partial();
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const ListTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  type: TaskTypeSchema.optional(),
  patientId: UuidSchema.optional(),
  userId: UuidSchema.optional(),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
