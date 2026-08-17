import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AppointmentSchema,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  CancelAppointmentSchema,
  CompleteAppointmentSchema,
  ListAppointmentsQuerySchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { appointmentsService } from './appointments.service.js';
import { resolveClinicId } from '../auth/auth.helpers.js';

const appointmentsRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.addHook('onRequest', app.authenticate);

  route.get(
    '/',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Lista agendamentos',
        querystring: ListAppointmentsQuerySchema,
        response: {
          200: PaginatedResponseSchema(AppointmentSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      return appointmentsService.list(clinicId, req.query);
    },
  );

  route.get(
    '/today',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Lista agendamentos de hoje',
        response: {
          200: PaginatedResponseSchema(AppointmentSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return appointmentsService.list(clinicId, {
        page: 1,
        pageSize: 100,
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
      });
    },
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Busca agendamento por ID',
        params: z.object({ id: UuidSchema }),
        response: { 200: AppointmentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const appt = await appointmentsService.findById(clinicId, req.params.id);
      if (!appt) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      return appt;
    },
  );

  route.post(
    '/',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Cria agendamento',
        body: CreateAppointmentSchema,
        response: { 201: AppointmentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const created = await appointmentsService.create(clinicId, req.body);
      return rep.code(201).send(created);
    },
  );

  route.patch(
    '/:id',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Atualiza agendamento',
        params: z.object({ id: UuidSchema }),
        body: UpdateAppointmentSchema,
        response: { 200: AppointmentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const updated = await appointmentsService.update(clinicId, req.params.id, req.body);
      if (!updated) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      return updated;
    },
  );

  route.post(
    '/:id/confirm',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Confirma agendamento',
        params: z.object({ id: UuidSchema }),
        response: { 200: AppointmentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await appointmentsService.confirm(clinicId, req.params.id);
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      return r;
    },
  );

  route.post(
    '/:id/start',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Inicia sessão do agendamento',
        params: z.object({ id: UuidSchema }),
        response: { 200: AppointmentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await appointmentsService.start(clinicId, req.params.id);
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      return r;
    },
  );

  route.post(
    '/:id/complete',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Completa agendamento (gera draft de evolução)',
        params: z.object({ id: UuidSchema }),
        body: CompleteAppointmentSchema,
        response: { 200: AppointmentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await appointmentsService.complete(clinicId, req.params.id, req.body);
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      return r;
    },
  );

  route.post(
    '/:id/cancel',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Cancela agendamento',
        params: z.object({ id: UuidSchema }),
        body: CancelAppointmentSchema,
        response: { 200: AppointmentSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await appointmentsService.cancel(clinicId, req.params.id, req.body);
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      return r;
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['appointments'],
        summary: 'Soft-delete de agendamento',
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await appointmentsService.remove(clinicId, req.params.id);
      if (!r) return rep.code(404).send({ error: 'NotFound', message: 'Appointment not found' });
      return rep.code(204).send(null);
    },
  );
};

export default appointmentsRoutes;
