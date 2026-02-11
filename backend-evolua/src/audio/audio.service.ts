import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAudioSessionDto, TranscribeAudioDto, SearchAudioSessionsDto } from './dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { AudioSession, Prisma } from '@prisma/client';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private readonly hfApiKey: string;
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.hfApiKey = this.config.get<string>('HUGGINGFACE_API_KEY', '');
    this.supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL');
    this.supabaseAnonKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
  }

  async create(clinicId: string, therapistId: string, dto: CreateAudioSessionDto): Promise<AudioSession> {
    return this.prisma.audioSession.create({
      data: {
        clinicId,
        therapistId,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        audioUrl: dto.audioUrl,
        audioDuration: dto.audioDuration,
        fileSize: dto.fileSize,
        transcriptionStatus: 'pending',
      },
    });
  }

  async findAll(clinicId: string, query: SearchAudioSessionsDto): Promise<PaginatedResponseDto<AudioSession>> {
    const where: Prisma.AudioSessionWhereInput = { clinicId };
    if (query.patientId) where.patientId = query.patientId;
    if (query.transcriptionStatus) where.transcriptionStatus = query.transcriptionStatus;

    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.audioSession.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { id: true, name: true } } },
      }),
      this.prisma.audioSession.count({ where }),
    ]);

    return new PaginatedResponseDto(sessions, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOne(id: string, clinicId: string): Promise<AudioSession> {
    const session = await this.prisma.audioSession.findFirst({ where: { id, clinicId } });
    if (!session) throw new NotFoundException('Sessão de áudio não encontrada');
    return session;
  }

  async transcribe(clinicId: string, dto: TranscribeAudioDto): Promise<AudioSession> {
    const session = await this.findOne(dto.audioSessionId, clinicId);

    // Update status to processing
    await this.prisma.audioSession.update({
      where: { id: session.id },
      data: { transcriptionStatus: 'processing' },
    });

    try {
      // 1. Download audio from Supabase Storage via direct HTTP (avoids RLS/auth issues)
      const audioBuffer = await this.downloadAudioFromStorage(session.audioUrl);
      this.logger.log(`Downloaded audio: ${audioBuffer.length} bytes`);

      // 2. Send to Hugging Face Whisper API
      this.logger.log('Sending audio to Hugging Face Whisper API...');
      const transcriptionText = await this.callWhisperApi(audioBuffer);
      this.logger.log(`Transcription completed: ${transcriptionText.substring(0, 100)}...`);

      // 3. Save transcription to DB
      return this.prisma.audioSession.update({
        where: { id: session.id },
        data: {
          transcription: transcriptionText,
          transcriptionStatus: 'completed',
          transcribedAt: new Date(),
          transcriptionError: null,
        },
      });
    } catch (error) {
      this.logger.error(`Transcription failed: ${error.message}`);

      // Handle model loading — set back to pending so user can retry
      if (error.message?.includes('503') || error.message?.includes('carregando')) {
        return this.prisma.audioSession.update({
          where: { id: session.id },
          data: {
            transcriptionStatus: 'pending',
            transcriptionError: 'Modelo de transcrição está carregando. Tente novamente em alguns segundos.',
          },
        });
      }

      // Save error state
      return this.prisma.audioSession.update({
        where: { id: session.id },
        data: {
          transcriptionStatus: 'failed',
          transcriptionError: error.message || 'Erro desconhecido na transcrição',
        },
      });
    }
  }

  async getTranscription(id: string, clinicId: string) {
    const session = await this.findOne(id, clinicId);
    return {
      transcription: session.transcription || '',
      transcriptionStatus: session.transcriptionStatus || 'pending',
    };
  }

  async remove(id: string, clinicId: string): Promise<void> {
    await this.findOne(id, clinicId);
    await this.prisma.audioSession.delete({ where: { id } });
  }

  /**
   * Download audio from Supabase Storage via direct HTTP.
   * Uses the public URL directly — avoids Supabase SDK auth issues
   * when service role key is not configured.
   */
  private async downloadAudioFromStorage(audioUrl: string): Promise<Buffer> {
    // If it's already a full public URL, fetch it directly
    if (audioUrl.startsWith('http')) {
      this.logger.log(`Downloading audio via HTTP: ${audioUrl.substring(0, 80)}...`);
      const response = await fetch(audioUrl);
      if (!response.ok) {
        // If public URL fails, try via Supabase Storage API with auth
        this.logger.warn(`Public URL download failed (${response.status}), trying Storage API...`);
        return this.downloadViaStorageApi(audioUrl);
      }
      return Buffer.from(await response.arrayBuffer());
    }

    // If it's a relative path, use Storage API
    return this.downloadViaStorageApi(audioUrl);
  }

  /** Download via Supabase Storage REST API with anon key auth */
  private async downloadViaStorageApi(audioUrl: string): Promise<Buffer> {
    const storagePath = this.extractStoragePath(audioUrl);
    this.logger.log(`Downloading via Storage API: ${storagePath}`);

    const url = `${this.supabaseUrl}/storage/v1/object/audio-sessions/${storagePath}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.supabaseAnonKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Call Hugging Face Whisper API for transcription.
   * Tries the router URL first, falls back to legacy api-inference URL.
   */
  private async callWhisperApi(audioBuffer: Buffer): Promise<string> {
    const urls = [
      'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3',
    ];

    let lastError = '';

    for (const url of urls) {
      this.logger.log(`Trying HF API: ${url}`);
      try {
        const hfResponse = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.hfApiKey}`,
            'Content-Type': 'audio/webm',
          },
          body: new Uint8Array(audioBuffer),
        });

        if (hfResponse.status === 503) {
          const body = await hfResponse.text();
          this.logger.warn(`HF model loading (503): ${body}`);
          throw new Error('Modelo de transcrição está carregando (503). Tente novamente em alguns segundos.');
        }

        if (hfResponse.status === 404) {
          lastError = `HF API 404 at ${url}`;
          this.logger.warn(lastError);
          continue; // Try next URL
        }

        if (!hfResponse.ok) {
          const errorBody = await hfResponse.text();
          this.logger.error(`HF API error ${hfResponse.status}: ${errorBody}`);
          throw new Error(`Hugging Face API error: ${hfResponse.status} - ${errorBody}`);
        }

        const result = await hfResponse.json();
        return result.text || '';
      } catch (error) {
        if (error.message?.includes('503') || error.message?.includes('carregando')) {
          throw error; // Re-throw 503 errors immediately
        }
        lastError = error.message;
        this.logger.warn(`HF API attempt failed: ${error.message}`);
      }
    }

    throw new Error(`Todas as tentativas de transcrição falharam. Último erro: ${lastError}`);
  }

  /** Extract the storage file path from a Supabase public URL */
  private extractStoragePath(audioUrl: string): string {
    // URL format: https://<project>.supabase.co/storage/v1/object/public/audio-sessions/<path>
    const marker = '/audio-sessions/';
    const idx = audioUrl.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(audioUrl.substring(idx + marker.length));
    }
    // Fallback: return the URL as-is (might already be a path)
    return audioUrl;
  }
}
