import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type {
  AiChatRequest,
  AiChatResponse,
  GenerateEvolutionRequest,
  GeneratedEvolution,
  GenerateMaterialRequest,
  GeneratedMaterial,
  GenerateReportRequest,
  GenerateReportResponse,
  LibraryDocumentListResponse,
  LibraryIngestResponse,
  LibraryIngestUrlRequest,
  LibraryListQuery,
} from '@evolua/contracts';

export class AiService {
  /**
   * Proxy para o serviço Python AI: RAG na biblioteca clínica.
   */
  async chat(req: AiChatRequest, userId: string, clinicId: string): Promise<AiChatResponse> {
    try {
      const res = await fetch(`${env.AI_SERVICE_URL}/library/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
          'x-user-id': userId,
          'x-clinic-id': clinicId,
        },
        body: JSON.stringify({
          question: req.question,
          history: req.history,
          specialty: req.specialty ?? '',
        }),
        signal: AbortSignal.timeout(50_000),
      });

      if (!res.ok) {
        await res.text();
        return this.fallback();
      }

      const data = (await res.json()) as Partial<AiChatResponse> & {
        sources?: AiChatResponse['citations'];
      };
      return {
        answer: data.answer ?? '',
        citations: data.citations ?? data.sources ?? [],
        latency_ms: data.latency_ms,
        model: data.model,
      };
    } catch {
      return this.fallback();
    }
  }

  /**
   * Proxy para geração de evolução SOAP a partir de transcript/notas.
   * Levanta erro em caso de falha (rota retorna 502).
   */
  async generateEvolution(
    req: GenerateEvolutionRequest,
    userId: string,
  ): Promise<GeneratedEvolution> {
    const res = await fetch(`${env.AI_SERVICE_URL}/clinical/evolution/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        'x-user-id': userId,
      },
      body: JSON.stringify({
        patient_id: req.patientId,
        transcript: req.transcript,
        therapist_notes: req.therapistNotes,
        treatment_plan_summary: req.treatmentPlanSummary,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      await res.text().catch(() => '');
      logger.warn({ statusCode: res.status }, 'ai: evolution provider unavailable');
      throw new Error('Serviço de geração de evolução indisponível.');
    }
    const data = (await res.json()) as {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      summary: string;
      next_session_suggestions: string[];
    };
    return {
      soap: data.soap,
      summary: data.summary,
      nextSessionSuggestions: data.next_session_suggestions ?? [],
    };
  }

  /**
   * Proxy para geração de material terapêutico (atividade, brincadeira, jogo etc.).
   * Levanta erro em caso de falha (rota retorna 502).
   */
  async generateMaterial(
    req: GenerateMaterialRequest,
    userId: string,
  ): Promise<GeneratedMaterial> {
    const res = await fetch(`${env.AI_SERVICE_URL}/clinical/material/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        'x-user-id': userId,
      },
      body: JSON.stringify({
        area: req.area,
        format: req.format,
        age: req.age,
        context: req.context ?? null,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      await res.text().catch(() => '');
      logger.warn({ statusCode: res.status }, 'ai: material provider unavailable');
      throw new Error('Serviço de geração de material indisponível.');
    }
    const data = (await res.json()) as {
      title: string;
      content: string;
      objectives?: string[];
      materials_needed?: string[];
      duration_minutes?: number | null;
      instructions?: string;
    };
    return {
      title: data.title,
      content: data.content,
      objectives: data.objectives ?? [],
      materialsNeeded: data.materials_needed ?? [],
      durationMinutes: data.duration_minutes ?? null,
      instructions: data.instructions ?? '',
    };
  }

  /**
   * Proxy para geração de relatório clínico estruturado.
   */
  async generateReport(
    req: GenerateReportRequest,
    userId: string,
  ): Promise<GenerateReportResponse> {
    try {
      const res = await fetch(`${env.AI_SERVICE_URL}/clinical/report/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
          'x-user-id': userId,
        },
        body: JSON.stringify({
          transcription: req.transcription,
          template: req.template,
          patient_name: req.patientName,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        await res.text();
        return { success: false, error: 'Serviço de IA indisponível. Tente novamente mais tarde.' };
      }

      const data = (await res.json()) as GenerateReportResponse;
      return data;
    } catch {
      return {
        success: false,
        error: 'Serviço de IA indisponível. Tente novamente mais tarde.',
      };
    }
  }

  /**
   * Lista documentos da biblioteca (proxy AI).
   */
  async listLibraryDocuments(
    query: LibraryListQuery,
    clinicId: string,
    userId: string,
  ): Promise<LibraryDocumentListResponse> {
    const url = new URL(`${env.AI_SERVICE_URL}/library/documents`);
    if (query.specialty) url.searchParams.set('specialty', query.specialty);
    url.searchParams.set('limit', String(query.limit));
    url.searchParams.set('offset', String(query.offset));

    const res = await fetch(url, {
      headers: {
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        'x-user-id': userId,
        'x-clinic-id': clinicId,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      await res.text().catch(() => '');
      logger.warn({ statusCode: res.status }, 'ai: library provider unavailable');
      throw new Error('Biblioteca com IA indisponível.');
    }
    return (await res.json()) as LibraryDocumentListResponse;
  }

  /**
   * Ingere documento na biblioteca via URL pública (Storage signed URL etc.).
   * O upload via multipart é feito direto pelo handler com formData streaming.
   */
  async ingestLibraryUrl(
    body: LibraryIngestUrlRequest,
    clinicId: string,
    userId: string,
  ): Promise<LibraryIngestResponse> {
    const form = new FormData();
    form.set('source_url', body.source_url);
    form.set('title', body.title);
    if (body.author) form.set('author', body.author);
    if (body.specialty) form.set('specialty', body.specialty);
    form.set('language', body.language);

    const res = await fetch(`${env.AI_SERVICE_URL}/library/ingest`, {
      method: 'POST',
      headers: {
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        'x-user-id': userId,
        'x-clinic-id': clinicId,
      },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      await res.text().catch(() => '');
      logger.warn({ statusCode: res.status }, 'ai: library URL ingestion unavailable');
      throw new Error('Ingestão da biblioteca indisponível.');
    }
    const data = (await res.json()) as {
      document_id: string;
      chunks: number;
      latency_ms: number;
    };
    return {
      documentId: data.document_id,
      chunks: data.chunks,
      latencyMs: data.latency_ms,
    };
  }

  /**
   * Ingere upload binário (file) repassando para o serviço Python como multipart.
   */
  async ingestLibraryFile(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    fields: {
      title: string;
      author?: string;
      specialty?: string;
      language: string;
    },
    clinicId: string,
    userId: string,
  ): Promise<LibraryIngestResponse> {
    const form = new FormData();
    form.set(
      'file',
      new Blob([new Uint8Array(fileBuffer)], { type: contentType }),
      filename,
    );
    form.set('title', fields.title);
    if (fields.author) form.set('author', fields.author);
    if (fields.specialty) form.set('specialty', fields.specialty);
    form.set('language', fields.language);

    const res = await fetch(`${env.AI_SERVICE_URL}/library/ingest`, {
      method: 'POST',
      headers: {
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
        'x-user-id': userId,
        'x-clinic-id': clinicId,
      },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) {
      await res.text().catch(() => '');
      logger.warn({ statusCode: res.status }, 'ai: library file ingestion unavailable');
      throw new Error('Ingestão da biblioteca indisponível.');
    }
    const data = (await res.json()) as {
      document_id: string;
      chunks: number;
      latency_ms: number;
    };
    return {
      documentId: data.document_id,
      chunks: data.chunks,
      latencyMs: data.latency_ms,
    };
  }

  async deleteLibraryDocument(
    documentId: string,
    clinicId: string,
    userId: string,
  ): Promise<void> {
    const res = await fetch(
      `${env.AI_SERVICE_URL}/library/documents/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
          'x-user-id': userId,
          'x-clinic-id': clinicId,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      await res.text().catch(() => '');
      logger.warn({ statusCode: res.status }, 'ai: library document deletion unavailable');
      throw new Error('Exclusão da biblioteca indisponível.');
    }
  }

  private fallback(): AiChatResponse {
    logger.warn('ai: chat fallback triggered');
    return {
      answer:
        'A base de conhecimento científica está indisponível no momento. Tente novamente em alguns instantes.',
      citations: [],
    };
  }
}

export const aiService = new AiService();
