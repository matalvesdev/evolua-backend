import { z } from 'zod';
import { UuidSchema } from './common.js';

export const NotificationSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  clinicId: UuidSchema,
  type: z.string(),
  title: z.string(),
  body: z.string(),
  metadata: z.unknown().nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const ListNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;

export const NotificationPreferenceSchema = z.object({
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  appointmentRemindersEnabled: z.boolean(),
  reportNotificationsEnabled: z.boolean(),
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

export const UpdateNotificationPreferenceSchema = NotificationPreferenceSchema.partial();
export type UpdateNotificationPreferenceInput = z.infer<
  typeof UpdateNotificationPreferenceSchema
>;

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;
