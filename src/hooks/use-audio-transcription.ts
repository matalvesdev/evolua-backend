"use client"

import * as React from "react"
import { api } from "@/lib/api/client"

export interface AudioSessionData {
  id: string
  audioUrl: string
  transcription?: string
  transcriptionStatus?: string
}

export interface TranscriptionResult {
  success: boolean
  transcription?: string
  error?: string
  sessionId?: string
}

export function useAudioTranscription() {
  const [transcribing, setTranscribing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  /** Create an AudioSession in the backend and get a real UUID */
  const createSession = React.useCallback(
    async (params: {
      patientId: string
      audioUrl: string
      appointmentId?: string
      audioDuration?: number
      fileSize?: number
    }): Promise<AudioSessionData | null> => {
      try {
        return await api.post<AudioSessionData>("/audio/sessions", params)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar sessão de áudio"
        setError(msg)
        return null
      }
    },
    []
  )

  /** Transcribe audio using the backend (Hugging Face Whisper) */
  const transcribeAudio = React.useCallback(
    async (audioUrl: string, audioSessionId: string, language = "pt"): Promise<TranscriptionResult> => {
      setTranscribing(true)
      setError(null)

      try {
        const data = await api.post<AudioSessionData>("/audio/transcribe", {
          audioUrl,
          audioSessionId,
          language,
        })

        if (data.transcriptionStatus === "failed") {
          return { success: false, error: "Falha na transcrição. Tente novamente.", sessionId: data.id }
        }

        if (data.transcriptionStatus === "pending") {
          return {
            success: false,
            error: "Modelo de transcrição está carregando. Tente novamente em alguns segundos.",
            sessionId: data.id,
          }
        }

        return { success: true, transcription: data.transcription || "", sessionId: data.id }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao transcrever áudio"
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setTranscribing(false)
      }
    },
    []
  )

  const getTranscription = React.useCallback(async (audioSessionId: string) => {
    try {
      return await api.get<{ transcription: string; transcriptionStatus: string }>(
        `/audio/sessions/${audioSessionId}/transcription`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar transcrição")
      return null
    }
  }, [])

  return { createSession, transcribeAudio, getTranscription, transcribing, error }
}
