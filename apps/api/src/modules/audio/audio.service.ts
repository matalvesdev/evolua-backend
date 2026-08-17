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
  ): Promise<{ transcription: string; transcriptionStatus: string; transcriptionError: string | null } | null> {
    const s = await this.findOne(clinicId, id);
    if (!s) return null;
    return {
      transcription: s.transcription ?? '',
      transcriptionStatus: s.transcriptionStatus ?? 'pending',
      transcriptionError: s.transcriptionError,
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

    void this.dispatchTranscription(updated, therapistId, input.language).catch(() => {
      logger.warn('audio: transcription dispatch failed');
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

      // Tenta o serviço Python AI primeiro (com retry para cold start)
      const aiResult = await this.tryAiService(signedUrl, session.id, therapistId, language);

      if (aiResult.success && aiResult.transcription) {
        await this.saveTranscription(session.id, aiResult.transcription);
        return;
      }

      // Fallback: Hugging Face Inference API direto (serverless, sem cold start)
      logger.info(
        { fallback: 'huggingface' },
        'audio: AI service unavailable, falling back to Hugging Face Inference API',
      );

      const hfResult = await this.tryHuggingFaceFallback(signedUrl);
      if (hfResult.success && hfResult.transcription) {
        await this.saveTranscription(session.id, hfResult.transcription);
        return;
      }

      // Ambos falharam
      await prisma.audioSession.update({
        where: { id: session.id },
        data: {
          transcriptionStatus: 'failed',
          transcriptionError: 'Transcrição indisponível. Tente novamente mais tarde.',
        },
      });
    } catch {
      await prisma.audioSession.update({
        where: { id: session.id },
        data: {
          transcriptionStatus: 'failed',
          transcriptionError: 'Transcrição indisponível. Tente novamente mais tarde.',
        },
      });
    }
  }

  /** Tenta transcrever via serviço Python AI com retry para cold start. */
  private async tryAiService(
    signedUrl: string,
    sessionId: string,
    therapistId: string,
    language?: string,
  ): Promise<{ success: boolean; transcription?: string; error?: string }> {
    const maxRetries = 2;
    const delays = [10_000, 20_000]; // 10s, 20s
    let lastError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = delays[attempt - 1] ?? 20_000;
        logger.info(
          { attempt, delayMs: delay },
          'audio: retrying AI service after cold start',
        );
        await new Promise(r => setTimeout(r, delay));
      }

      try {
        const res = await fetch(`${env.AI_SERVICE_URL}/clinical/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
            'x-user-id': therapistId,
          },
          body: JSON.stringify({
            audio_session_id: sessionId,
            audio_url: signedUrl,
            language: language ?? 'pt',
          }),
          signal: AbortSignal.timeout(60_000),
        });

        if (res.ok) {
          const data = (await res.json()) as { transcription: string };
          return { success: true, transcription: data.transcription };
        }

        await res.text();
        lastError = `HTTP ${res.status}`;

        // Só retry em 502/503 (cold start). Outros erros são finais.
        if (res.status !== 502 && res.status !== 503) {
          return { success: false, error: lastError };
        }
      } catch {
        lastError = 'network_or_timeout';
        // Timeout ou network error — pode ser cold start
        if (attempt < maxRetries) continue;
        return { success: false, error: lastError };
      }
    }

    return { success: false, error: `cold start timeout (${lastError})` };
  }

  /** Fallback direto para Hugging Face Inference API (Whisper-large-v3). */
  private async tryHuggingFaceFallback(
    signedUrl: string,
  ): Promise<{ success: boolean; transcription?: string; error?: string }> {
    if (!env.HUGGINGFACE_API_KEY) {
      return { success: false, error: 'HUGGINGFACE_API_KEY not configured' };
    }

    try {
      // 1. Baixa o áudio do signed URL
      const audioRes = await fetch(signedUrl, { signal: AbortSignal.timeout(30_000) });
      if (!audioRes.ok) {
        return { success: false, error: `Failed to download audio: ${audioRes.status}` };
      }
      const audioBytes = await audioRes.arrayBuffer();

      // 2. Envia para Hugging Face Inference API
      const hfRes = await fetch(
        'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'audio/webm',
          },
          body: audioBytes,
          signal: AbortSignal.timeout(120_000),
        },
      );

      if (!hfRes.ok) {
        return { success: false, error: `HF API ${hfRes.status}` };
      }

      const data = (await hfRes.json()) as { text?: string };
      if (!data.text) {
        return { success: false, error: 'HF API returned empty transcription' };
      }

      return { success: true, transcription: data.text };
    } catch {
      return { success: false, error: 'network_or_timeout' };
    }
  }

  private async saveTranscription(sessionId: string, transcription: string): Promise<void> {
    await prisma.audioSession.update({
      where: { id: sessionId },
      data: {
        transcription,
        transcriptionStatus: 'completed',
        transcribedAt: new Date(),
      },
    });
  }
}

export const audioService = new AudioService();
