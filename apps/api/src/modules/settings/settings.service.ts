import { prisma } from '../../lib/prisma.js';

export interface Settings {
  clinicName: string;
  clinicPhone: string;
  clinicEmail: string;
  workingHours: Record<string, { start: string; end: string }>;
  appointmentDuration: number;
  allowTeleconsulta: boolean;
  notificationEmail: boolean;
  notificationWhatsApp: boolean;
  autoSendReminders: boolean;
  reminder24h: boolean;
  reminder1h: boolean;
}

export class SettingsService {
  async get(clinicId: string, userId: string): Promise<Settings> {
    const [clinic, pref] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId } }),
      prisma.notificationPreference.findUnique({
        where: { userId_clinicId: { userId, clinicId } },
      }),
    ]);

    const settings = ((clinic as Record<string, unknown>)?.settings ?? {}) as Record<string, unknown>;

    return {
      clinicName: clinic?.name ?? '',
      clinicPhone: clinic?.phone ?? '',
      clinicEmail: clinic?.email ?? '',
      notificationEmail: pref?.emailEnabled ?? true,
      notificationWhatsApp: pref?.appointmentRemindersEnabled ?? true,
      workingHours: (settings.workingHours ?? {}) as Record<string, { start: string; end: string }>,
      appointmentDuration: (settings.appointmentDuration as number) ?? 50,
      allowTeleconsulta: (settings.allowTeleconsulta as boolean) ?? false,
      autoSendReminders: (settings.autoSendReminders as boolean) ?? false,
      reminder24h: (settings.reminder24h as boolean) ?? true,
      reminder1h: (settings.reminder1h as boolean) ?? false,
    };
  }

  async update(
    clinicId: string,
    userId: string,
    input: Partial<Settings>,
  ): Promise<Settings> {
    const clinicUpdate: Record<string, unknown> = {};
    if (input.clinicName !== undefined) clinicUpdate.name = input.clinicName;
    if (input.clinicPhone !== undefined) clinicUpdate.phone = input.clinicPhone;
    if (input.clinicEmail !== undefined) clinicUpdate.email = input.clinicEmail;

    const settingsFields = [
      'workingHours',
      'appointmentDuration',
      'allowTeleconsulta',
      'autoSendReminders',
      'reminder24h',
      'reminder1h',
    ] as const;
    const settingsUpdate: Record<string, unknown> = {};
    for (const key of settingsFields) {
      if ((input as Record<string, unknown>)[key] !== undefined) {
        settingsUpdate[key] = (input as Record<string, unknown>)[key];
      }
    }

    if (Object.keys(clinicUpdate).length > 0 || Object.keys(settingsUpdate).length > 0) {
      const existing = await prisma.clinic.findUnique({
        where: { id: clinicId },
      });
      const existingSettings = ((existing as Record<string, unknown>)?.settings ?? {}) as Record<string, unknown>;
      const merged = {
        ...existingSettings,
        ...settingsUpdate,
      };
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          ...clinicUpdate,
          ...(Object.keys(settingsUpdate).length > 0 ? { settings: merged as never } : {}),
        },
      });
    }

    const prefUpdate: Record<string, unknown> = {};
    if (input.notificationEmail !== undefined) prefUpdate.emailEnabled = input.notificationEmail;
    if (input.notificationWhatsApp !== undefined) {
      prefUpdate.appointmentRemindersEnabled = input.notificationWhatsApp;
    }
    if (Object.keys(prefUpdate).length > 0) {
      await prisma.notificationPreference.upsert({
        where: { userId_clinicId: { userId, clinicId } },
        create: { userId, clinicId, ...prefUpdate },
        update: prefUpdate,
      });
    }

    return this.get(clinicId, userId);
  }
}

export const settingsService = new SettingsService();
