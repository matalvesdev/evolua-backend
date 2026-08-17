/**
 * Scheduler service — Appointment reminder scheduler.
 *
 * Runs every 5 minutes and sends 24h and 1h reminders via email + WhatsApp
 * for appointments with status 'scheduled' or 'confirmed'.
 *
 * Uses `toad-scheduler` for reliable interval scheduling with error isolation.
 */
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { emailService } from '../email/email.service.js';
import { waCrmService } from '../wa-crm/wa-crm.service.js';
import { messagesService } from '../messages/messages.service.js';

// ── Constants ───────────────────────────────────────────────────────────

/** Scheduler tick interval */
const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** 24h reminder window: 23h–25h ahead */
const TWENTY_FOUR_H_WINDOW_START_MS = 23 * 60 * 60 * 1000;
const TWENTY_FOUR_H_WINDOW_END_MS = 25 * 60 * 60 * 1000;

/** 1h reminder window: 30min–90min ahead */
const ONE_H_WINDOW_START_MS = 0.5 * 60 * 60 * 1000;
const ONE_H_WINDOW_END_MS = 1.5 * 60 * 60 * 1000;
const REMINDER_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

// ── Helpers ─────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRecipientName(
  guardianName: string | null | undefined,
  name: string,
): string {
  return guardianName ?? name;
}

function getRecipientPhone(
  guardianPhone: string | null | undefined,
  phone: string | null | undefined,
): string | null {
  return guardianPhone ?? phone ?? null;
}

// ── Message templates ───────────────────────────────────────────────────

function build24hWhatsAppMessage(recipientName: string, date: string, time: string): string {
  return (
    `🔔 *Lembrete de consulta*\n\n` +
    `Olá *${recipientName}*,\n\n` +
    `Passando para lembrar que você tem uma consulta amanhã:\n` +
    `📅 *Data:* ${date}\n` +
    `⏰ *Horário:* ${time}\n\n` +
    `Caso precise remarcar ou cancelar, entre em contato conosco com antecedência.\n\n` +
    `_Equipe Evolua_`
  );
}

function build1hWhatsAppMessage(recipientName: string, date: string, time: string): string {
  return (
    `⏰ *Sua consulta é em 1 hora!*\n\n` +
    `Olá *${recipientName}*,\n\n` +
    `Sua consulta de hoje está chegando:\n` +
    `📅 *Data:* ${date}\n` +
    `⏰ *Horário:* ${time}\n\n` +
    `Não se atrase! Se houver imprevistos, avise-nos o quanto antes.\n\n` +
    `_Equipe Evolua_`
  );
}

// ── Core reminder logic ─────────────────────────────────────────────────

interface AppointmentWithPatient {
  id: string;
  clinicId: string;
  patientId: string;
  therapistId: string | null;
  dateTime: Date;
  patient: {
    name: string;
    guardianName: string | null;
    phone: string | null;
    guardianPhone: string | null;
    email: string | null;
  };
}

async function sendReminders(
  appointments: AppointmentWithPatient[],
  type: '24h' | '1h',
): Promise<void> {
  for (const appointment of appointments) {
    try {
      const staleBefore = new Date(Date.now() - REMINDER_CLAIM_TIMEOUT_MS);
      const claimed = type === '24h'
        ? await prisma.appointment.updateMany({
          where: {
            id: appointment.id,
            reminder24hSentAt: null,
            OR: [{ reminder24hClaimedAt: null }, { reminder24hClaimedAt: { lt: staleBefore } }],
          },
          data: { reminder24hClaimedAt: new Date() },
        })
        : await prisma.appointment.updateMany({
          where: {
            id: appointment.id,
            reminder1hSentAt: null,
            OR: [{ reminder1hClaimedAt: null }, { reminder1hClaimedAt: { lt: staleBefore } }],
          },
          data: { reminder1hClaimedAt: new Date() },
        });
      if (claimed.count === 0) continue;

      const date = formatDate(appointment.dateTime);
      const time = formatTime(appointment.dateTime);
      const recipientName = getRecipientName(
        appointment.patient.guardianName,
        appointment.patient.name,
      );
      const phone = getRecipientPhone(
        appointment.patient.guardianPhone,
        appointment.patient.phone,
      );
      const email = appointment.patient.email;
      const preferences = appointment.therapistId
        ? await prisma.notificationPreference.findUnique({
          where: {
            userId_clinicId: {
              userId: appointment.therapistId,
              clinicId: appointment.clinicId,
            },
          },
          select: { emailEnabled: true, appointmentRemindersEnabled: true },
        })
        : null;
      const remindersEnabled = preferences?.appointmentRemindersEnabled ?? true;
      const emailEnabled = preferences?.emailEnabled ?? true;

      const errors: string[] = [];

      // 1. Send via email if patient has an email address
      if (email && remindersEnabled && emailEnabled) {
        try {
          if (type === '24h') {
            await emailService.sendAppointmentReminder24h(email, recipientName, date, time);
          } else {
            await emailService.sendAppointmentReminder1h(email, recipientName, date, time);
          }
          logger.debug(
            { appointmentId: appointment.id, type, channel: 'email' },
            'Reminder email sent',
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`email: ${msg}`);
          logger.error(
            { err, appointmentId: appointment.id, type, channel: 'email' },
            'Failed to send reminder email',
          );
        }
      }

      // 2. Send via WhatsApp if phone is available
      if (phone && remindersEnabled) {
        try {
          const message =
            type === '24h'
              ? build24hWhatsAppMessage(recipientName, date, time)
              : build1hWhatsAppMessage(recipientName, date, time);

          await waCrmService.sendText(appointment.clinicId, {
            patientId: appointment.patientId,
            message,
            type: 'text',
          });
          logger.debug(
            { appointmentId: appointment.id, type, channel: 'whatsapp' },
            'Reminder WhatsApp sent',
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`whatsapp: ${msg}`);
          logger.error(
            { err, appointmentId: appointment.id, type, channel: 'whatsapp' },
            'Failed to send reminder WhatsApp',
          );
        }
      }

      // 3. Update the sentAt field — even if one channel failed, we mark it sent
      //    to avoid re-sending and flooding the patient.
      const updateField = type === '24h'
        ? { reminder24hSentAt: new Date(), reminder24hClaimedAt: null }
        : { reminder1hSentAt: new Date(), reminder1hClaimedAt: null };

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: updateField,
      });

      if (errors.length > 0) {
        logger.warn(
          {
            appointmentId: appointment.id,
            type,
            errors: errors.join('; '),
            partial: true,
          },
          'Reminder sent with partial failures',
        );
      } else {
        logger.info(
          { appointmentId: appointment.id, type },
          'Reminder sent successfully via all channels',
        );
      }
    } catch (err) {
      const releaseClaim = type === '24h'
        ? { reminder24hClaimedAt: null }
        : { reminder1hClaimedAt: null };
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: releaseClaim,
      }).catch(() => null);
      // Catastrophic failure for this single appointment — log and continue
      logger.error(
        { err, appointmentId: appointment.id, type },
        'Unexpected error processing appointment reminder',
      );
    }
  }
}

// ── Scheduler tick ──────────────────────────────────────────────────────

async function processReminders(): Promise<void> {
  const now = new Date();

  try {
    await messagesService.processPendingDeliveries();
    // ── 24h reminders ──────────────────────────────────────────────
    const twentyFourHAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['scheduled', 'confirmed'] },
        reminder24hSentAt: null,
        dateTime: {
          gte: new Date(now.getTime() + TWENTY_FOUR_H_WINDOW_START_MS),
          lte: new Date(now.getTime() + TWENTY_FOUR_H_WINDOW_END_MS),
        },
        deletedAt: null,
      },
      include: {
        patient: {
          select: {
            name: true,
            guardianName: true,
            phone: true,
            guardianPhone: true,
            email: true,
          },
        },
      },
    });

    if (twentyFourHAppointments.length > 0) {
      logger.info(
        { count: twentyFourHAppointments.length, type: '24h' },
        'Processing 24h appointment reminders',
      );
      await sendReminders(twentyFourHAppointments, '24h');
    }

    // ── 1h reminders ───────────────────────────────────────────────
    const oneHourAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['scheduled', 'confirmed'] },
        reminder1hSentAt: null,
        dateTime: {
          gte: new Date(now.getTime() + ONE_H_WINDOW_START_MS),
          lte: new Date(now.getTime() + ONE_H_WINDOW_END_MS),
        },
        deletedAt: null,
      },
      include: {
        patient: {
          select: {
            name: true,
            guardianName: true,
            phone: true,
            guardianPhone: true,
            email: true,
          },
        },
      },
    });

    if (oneHourAppointments.length > 0) {
      logger.info(
        { count: oneHourAppointments.length, type: '1h' },
        'Processing 1h appointment reminders',
      );
      await sendReminders(oneHourAppointments, '1h');
    }
  } catch (err) {
    logger.error({ err }, 'Scheduler tick failed — database or unexpected error');
  }
}

// ── Scheduler lifecycle ─────────────────────────────────────────────────

let scheduler: ToadScheduler | null = null;

/**
 * Start the appointment reminder scheduler.
 * Safe to call multiple times — stops any existing instance first.
 */
export function startScheduler(): ToadScheduler {
  if (scheduler) {
    scheduler.stop();
  }

  scheduler = new ToadScheduler();

  const task = new AsyncTask(
    'appointment-reminders',
    processReminders,
    (err: Error) => {
      // This handler catches unhandled exceptions thrown inside processReminders
      // that were not caught by the try/catch (defensive fallback).
      logger.error({ err }, 'Scheduler task unhandled error — task will retry');
    },
  );

  const job = new SimpleIntervalJob(
    { milliseconds: TICK_INTERVAL_MS, runImmediately: true },
    task,
  );

  scheduler.addSimpleIntervalJob(job);

  logger.info(
    { intervalMs: TICK_INTERVAL_MS },
    'Appointment reminder scheduler started',
  );

  return scheduler;
}

/**
 * Stop the appointment reminder scheduler gracefully.
 */
export function stopScheduler(): void {
  if (scheduler) {
    scheduler.stop();
    scheduler = null;
    logger.info('Appointment reminder scheduler stopped');
  }
}
