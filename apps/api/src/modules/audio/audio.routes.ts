import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AudioSessionSchema,
  CreateAudioSessionSchema,
  ListAudioSessionsQuerySchema,
  TranscribeAudioSchema,
  ErrorResponseSchema,
  PaginatedResponseSchema,
  UuidSchema,
} from '@evolua/contracts';
import { audioService } from './audio.service.js';
import { audioMapper } from './audio.mapper.js';
import { resolveClinicId } from '../auth/auth.helpers.js';
import { auditAsync } from '../../lib/audit.js';

const notFound = { error: 'NotFound', message: 'Audio session not found' };

const audioRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();
  route.addHook('onRequest', app.authenticate);

  route.post(
    '/',
    {
      schema: {
        tags: ['audio'],
        body: CreateAudioSessionSchema,
        response: { 201: AudioSessionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const s = await audioService.create(clinicId, req.user.id, req.body);
      auditAsync({
        clinicId, userId: req.user.id, action: 'CREATE', resource: 'AudioSession',
        resourceId: s.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
        metadata: { patientId: req.body.patientId ?? null },
      });
      return rep.code(201).send(audioMapper.toDto(s));
    },
  );

  route.get(
    '/',
    {
      schema: {
        tags: ['audio'],
        querystring: ListAudioSessionsQuerySchema,
        response: { 200: PaginatedResponseSchema(AudioSessionSchema) },
      },
    },
    async (req) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await audioService.list(clinicId, req.query);
      return { data: r.data.map((s) => audioMapper.toDto(s)), pagination: r.pagination };
    },
  );

  route.get(
    '/:id',
    {
      schema: {
        tags: ['audio'],
        params: z.object({ id: UuidSchema }),
        response: { 200: AudioSessionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const s = await audioService.findOne(clinicId, req.params.id);
      if (!s) return rep.code(404).send(notFound);
      let signedUrl: string | null = null;
      try {
        signedUrl = await audioService.signUrl(s.audioUrl);
      } catch (err) {
        req.log.warn({ err, sessionId: s.id }, 'audio: signed URL generation failed');
      }
      return audioMapper.toDto(s, signedUrl);
    },
  );

  route.get(
    '/:id/transcription',
    {
      schema: {
        tags: ['audio'],
        params: z.object({ id: UuidSchema }),
        response: {
          200: z.object({ transcription: z.string(), transcriptionStatus: z.string() }),
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const r = await audioService.getTranscription(clinicId, req.params.id);
      if (!r) return rep.code(404).send(notFound);
      return r;
    },
  );

  route.post(
    '/transcribe',
    {
      schema: {
        tags: ['audio'],
        body: TranscribeAudioSchema,
        response: { 200: AudioSessionSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const s = await audioService.transcribe(clinicId, req.user.id, req.body);
      if (!s) return rep.code(404).send(notFound);
      auditAsync({
        clinicId, userId: req.user.id, action: 'AUDIO_TRANSCRIBE', resource: 'AudioSession',
        resourceId: s.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return audioMapper.toDto(s);
    },
  );

  route.delete(
    '/:id',
    {
      schema: {
        tags: ['audio'],
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null(), 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const clinicId = await resolveClinicId(req.user.id);
      const ok = await audioService.remove(clinicId, req.params.id);
      if (!ok) return rep.code(404).send(notFound);
      auditAsync({
        clinicId, userId: req.user.id, action: 'DELETE', resource: 'AudioSession',
        resourceId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null,
      });
      return rep.code(204).send(null);
    },
  );
};

export default audioRoutes;
