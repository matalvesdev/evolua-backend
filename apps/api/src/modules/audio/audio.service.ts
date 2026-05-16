import type { Prisma, AudioSession } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type {
  CreateAudioSessionInput,
  ListAudioSessionsQuery,
  TranscribeAudioInput,
} from '@evolua/contracts';

export interface PaginatedAudioSessions {
  data: AudioSession[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

const BUCKET = 'audio-sessions';
const SIGN_TTL_SECONDS = 3600; // 1h

/**
 * Gera signed URL para um path do bucket privado `audio-sessions`.
 * Usa o endpoint REST `/storage/v1/object/sign/<bucket>/<path>` com service_role.
 */
async function createSignedUrl(path: string, ttlSeconds = SIGN_TTL_SECONDS): Promise<string> {
  const url = `${env.SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: ttlSeconds }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase Storage sign ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const rel = data.signedURL ?? data.signedUrl;
  if (!rel) throw new Error('Supabase Storage: signedURL ausente na resposta');
  // `signedURL` vem como path relativo: `/object/sign/<bucket>/...?token=...`
  return `${env.SUPABASE_URL}/storage/v1${rel.startsWith('/') ? rel : `/${rel}`}`;
}

export class AudioService {
  /** Exposto para o mapper / rotas gerarem URL de reprodução. */
  signUrl(path: string): Promise<string> {
    return createSignedUrl(path);
  }

  async create(
    clinicId: string,
    therapistId: string,
    input: CreateAudioSessionInput,
  ): Promise<AudioSession> {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) {
      const err = new Error('Patient not found in this clinic');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }

    // Path obrigatório precisa começar com o patientId (defesa em profundidade).
    if (!input.audioPath.startsWith(`${input.patientId}/`)) {
      const err = new Error('audioPath deve começar com <patientId>/');
      (err as Error & { statusCode: number }).statusCode = 400;
      throw err;
    }

    return prisma.audioSession.create({
      data: {
        clinicId,
        therapistId,
        patientId: input.patientId,
        appointmentId: input.appointmentId ?? null,
        // Coluna `audio_url` no DB armazena o PATH (string opaca p/ o Prisma).
        audioUrl: input.audioPath,
        audioDuration: input.audioDuration ?? null,
        fileSize: input.fileSize ?? null,
        transcriptionStatus: 'pending',
      },
    });
  }

  async list(
    clinicId: string,
    query: ListAudioSessionsQuery,
  ): Promise<PaginatedAudioSessions> {
    const where: Prisma.AudioSessionWhereInput = { clinicId, deletedAt: null };
    if (query.patientId) where.patientId = query.patientId;
    if (query.transcriptionStatus) where.transcriptionStatus = query.transcriptionStatus;

    const [data, total] = await prisma.$transaction([
      prisma.audioSession.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.audioSession.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async findOne(clinicId: string, id: string): Promise<AudioSession | null> {
    return prisma.audioSession.findFirst({ where: { id, clinicId, deletedAt: null } });
  }

  async getTranscription(
    clinicId: string,
    id: string,
  ): Promise<{ transcription: string; transcriptionStatus: string } | null> {
    const s = await this.findOne(clinicId, id);
    if (!s) return null;
    return {
      transcription: s.transcription ?? '',
      transcriptionStatus: s.transcriptionStatus ?? 'pending',
    };
  }

  async remove(clinicId: string, id: string): Promise<boolean> {
    const s = await this.findOne(clinicId, id);
    if (!s) return false;
    await prisma.audioSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }

  /**
   * Solicita transcrição ao serviço Python AI.
   *
   * Gera signed URL just-in-time para que o Python baixe o áudio do bucket privado.
   * O serviço Python faz: GET signed URL → Whisper → este Node atualiza o registro
   * via callback (atualmente: a chamada bloqueia e retornamos o texto direto).
   */
  async transcribe(
    clinicId: string,
    therapistId: string,
    input: TranscribeAudioInput,
  ): Promise<AudioSession | null> {
    const session = await this.findOne(clinicId, input.audioSessionId);
    if (!session) return null;

    const updated = await prisma.audioSession.update({
      where: { id: session.id },
      data: { transcriptionStatus: 'processing', transcriptionError: null },
    });

    void this.dispatchTranscription(updated, therapistId, input.language).catch((err) => {
      logger.warn(
        { err, sessionId: updated.id, patientId: updated.patientId },
        'audio: transcription dispatch failed',
      );
    });

    return updated;
  }

  private async dispatchTranscription(
    session: AudioSession,
    therapistId: string,
    language?: string,
  ): Promise<void> {
    try {
      // Coluna `audioUrl` no Prisma armazena o storage path.
      const signedUrl = await createSignedUrl(session.audioUrl, 1800); // 30min — espaço para download
      const res = await fetch(`${env.AI_SERVICE_URL}/clinical/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
          'x-user-id': therapistId,
        },
        body: JSON.stringify({
          audio_session_id: session.id,
          audio_url: signedUrl,
          language: language ?? 'pt',
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        const body = await res.text();
        await prisma.audioSession.update({
          where: { id: session.id },
          data: {
            transcriptionStatus: 'failed',
            transcriptionError: `AI service ${res.status}: ${body.slice(0, 500)}`,
          },
        });
        return;
      }
      const data = (await res.json()) as { transcription: string };
      await prisma.audioSession.update({
        where: { id: session.id },
        data: {
          transcription: data.transcription ?? '',
          transcriptionStatus: 'completed',
          transcribedAt: new Date(),
        },
      });
    } catch (e) {
      await prisma.audioSession.update({
        where: { id: session.id },
        data: {
          transcriptionStatus: 'failed',
          transcriptionError: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}

export const audioService = new AudioService();
