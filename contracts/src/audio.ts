import { z } from 'zod';
import { UuidSchema } from './common.js';

export const TranscriptionStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed']);
export type TranscriptionStatus = z.infer<typeof TranscriptionStatusEnum>;

/**
 * Path no bucket privado `audio-sessions`: `<patientUuid>/<arquivo>.<ext>`
 *
 * Não aceita `..`, barras duplicadas ou caminhos absolutos.
 */
export const AudioPathSchema = z
  .string()
  .min(40)
  .max(200)
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-zA-Z0-9._-]+\.(webm|ogg|mp4|mp3|wav|m4a)$/,
    'audioPath deve seguir o formato <patientUuid>/<arquivo>.<ext>',
  );

export const AudioSessionSchema = z.object({
  id: UuidSchema,
  clinicId: UuidSchema,
  patientId: UuidSchema,
  therapistId: UuidSchema,
  appointmentId: UuidSchema.nullable(),
  /** Storage path persistido (ex: `<patientId>/sessao-2026-05-10.webm`). */
  audioPath: z.string(),
  /** URL assinada gerada sob demanda (1h) para reprodução. Vazia em listagens. */
  audioUrl: z.string().nullable(),
  audioDuration: z.number().int().nullable(),
  fileSize: z.number().int().nullable(),
  transcription: z.string().nullable(),
  transcriptionStatus: z.string(),
  transcriptionError: z.string().nullable(),
  transcribedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AudioSession = z.infer<typeof AudioSessionSchema>;

export const CreateAudioSessionSchema = z.object({
  patientId: UuidSchema,
  appointmentId: UuidSchema.optional(),
  audioPath: AudioPathSchema,
  audioDuration: z.number().int().min(0).optional(),
  fileSize: z.number().int().min(0).optional(),
});
export type CreateAudioSessionInput = z.infer<typeof CreateAudioSessionSchema>;

export const CreateAudioUploadSchema = z.object({
  patientId: UuidSchema,
  contentType: z.enum([
    'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav',
    'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
  ]),
});
export type CreateAudioUploadInput = z.infer<typeof CreateAudioUploadSchema>;

export const AudioUploadTargetSchema = z.object({
  path: AudioPathSchema,
  token: z.string().min(1),
});

export const TranscribeAudioSchema = z.object({
  audioSessionId: UuidSchema,
  language: z.string().max(10).optional(),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioSchema>;

export const ListAudioSessionsQuerySchema = z.object({
  patientId: UuidSchema.optional(),
  transcriptionStatus: TranscriptionStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAudioSessionsQuery = z.infer<typeof ListAudioSessionsQuerySchema>;
