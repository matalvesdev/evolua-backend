"use client"

import * as React from "react"
import { api } from "@/lib/api/client"

export interface TranscriptionOptions {
  audioSessionId: string
  language?: string
}

export interface TranscriptionResult {
  success: boolean
  transcription?: string
  error?: string
}

export function useAudioTranscription() {
  const [transcribing, setTranscribing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const transcribeAudio = React.useCallback(
    async (audioUrl: string, options: TranscriptionOptions): Promise<TranscriptionResult> => {
      setTranscribing(true)
      setError(null)

      try {
        const data = await api.post<TranscriptionResult>("/audio/transcribe", {
          audioUrl,
          audioSessionId: options.audioSessionId,
          language: options.language || "pt",
        })

        return { success: true, transcription: data.transcription }
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

  return { transcribeAudio, getTranscription, transcribing, error }
}
