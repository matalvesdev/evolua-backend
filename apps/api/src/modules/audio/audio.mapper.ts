import type { AudioSession as PrismaAudioSession } from '@prisma/client';
import type { AudioSession } from '@evolua/contracts';

export const audioMapper = {
  /**
   * Mapeia row Prisma para DTO. A coluna `audio_url` no DB armazena o STORAGE PATH;
   * o DTO expõe `audioPath` (raw) e `audioUrl` (signed URL opcional, gerada sob demanda).
   */
  toDto(s: PrismaAudioSession, signedUrl: string | null = null): AudioSession {
    return {
      id: s.id,
      clinicId: s.clinicId,
      patientId: s.patientId,
      therapistId: s.therapistId,
      appointmentId: s.appointmentId,
      audioPath: s.audioUrl,
      audioUrl: signedUrl,
      audioDuration: s.audioDuration,
      fileSize: s.fileSize,
      transcription: s.transcription,
      transcriptionStatus: s.transcriptionStatus ?? 'pending',
      transcriptionError: s.transcriptionError,
      transcribedAt: s.transcribedAt ? s.transcribedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  },
};
