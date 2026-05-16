import { prisma } from '../../lib/prisma.js';
import type {
  ListNotificationsQuery,
  Notification,
  UpdateNotificationPreferenceInput,
  PushSubscriptionInput,
} from '@evolua/contracts';
import type { Notification as PrismaNotification } from '@prisma/client';

function toDTO(n: PrismaNotification): Notification {
  return {
    id: n.id,
    userId: n.userId,
    clinicId: n.clinicId,
    type: n.type,
    title: n.title,
    body: n.body,
    metadata: n.metadata ?? null,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

export class NotificationsService {
  async list(clinicId: string, userId: string, q: ListNotificationsQuery) {
    const where = {
      userId,
      clinicId,
      ...(q.unreadOnly && { readAt: null }),
    };
    const [rows, total, unread] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, clinicId, readAt: null } }),
    ]);
    return {
      data: rows.map(toDTO),
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      },
      meta: { unreadCount: unread },
    };
  }

  async markRead(clinicId: string, userId: string, id: string) {
    const exists = await prisma.notification.findFirst({
      where: { id, userId, clinicId },
      select: { id: true },
    });
    if (!exists) return null;
    const row = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return toDTO(row);
  }

  async markAllRead(clinicId: string, userId: string) {
    const r = await prisma.notification.updateMany({
      where: { userId, clinicId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: r.count };
  }

  // ── Preferences ─────────────────────────────────────────────────────────
  async getPreferences(clinicId: string, userId: string) {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId_clinicId: { userId, clinicId } },
    });
    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: { userId, clinicId },
      });
    }
    return {
      emailEnabled: pref.emailEnabled,
      pushEnabled: pref.pushEnabled,
      inAppEnabled: pref.inAppEnabled,
      appointmentRemindersEnabled: pref.appointmentRemindersEnabled,
      reportNotificationsEnabled: pref.reportNotificationsEnabled,
    };
  }

  async updatePreferences(
    clinicId: string,
    userId: string,
    input: UpdateNotificationPreferenceInput,
  ) {
    await prisma.notificationPreference.upsert({
      where: { userId_clinicId: { userId, clinicId } },
      create: { userId, clinicId, ...input },
      update: input,
    });
    return this.getPreferences(clinicId, userId);
  }

  // ── Push subscriptions ──────────────────────────────────────────────────
  async subscribePush(clinicId: string, userId: string, input: PushSubscriptionInput) {
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: input.endpoint } },
      create: {
        userId,
        clinicId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
      update: { p256dh: input.p256dh, auth: input.auth, clinicId },
    });
  }

  async unsubscribePush(userId: string, endpoint: string) {
    await prisma.pushSubscription
      .delete({ where: { userId_endpoint: { userId, endpoint } } })
      .catch(() => null);
  }
}

export const notificationsService = new NotificationsService();
