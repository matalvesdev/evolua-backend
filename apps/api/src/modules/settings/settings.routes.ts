import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { settingsService } from './settings.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const WorkingHoursSchema = z.record(
  z.string(),
  z.object({ start: z.string(), end: z.string() }),
);

const SettingsSchema = z.object({
  clinicName: z.string(),
  clinicPhone: z.string(),
  clinicEmail: z.string(),
  workingHours: WorkingHoursSchema,
  appointmentDuration: z.number(),
  allowTeleconsulta: z.boolean(),
  notificationEmail: z.boolean(),
  notificationWhatsApp: z.boolean(),
  autoSendReminders: z.boolean(),
  reminder24h: z.boolean(),
  reminder1h: z.boolean(),
});

const UpdateSettingsSchema = SettingsSchema.partial();

const settingsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['settings'],
        response: { 200: SettingsSchema },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      return settingsService.get(clinicId, req.user.id);
    },
  );

  route.patch(
    '/',
    {
      schema: {
        tags: ['settings'],
        body: UpdateSettingsSchema,
        response: { 200: SettingsSchema },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      return settingsService.update(clinicId, req.user.id, req.body);
    },
  );
};

export default settingsRoutes;
