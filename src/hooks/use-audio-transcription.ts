"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase/client"

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
        // Update status to processing
        await supabase
          .from("audio_sessions")
          .update({
            transcription_status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", options.audioSessionId)

        // Call Hugging Face Whisper model for transcription
        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audioUrl,
            language: options.language || "pt",
          }),
        })

        if (!response.ok) {
          throw new Error("Erro ao transcrever áudio")
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Erro ao transcrever áudio")
        }

        // Update database with transcription
        const { error: updateError } = await supabase
          .from("audio_sessions")
          .update({
            transcription: data.transcription,
            transcription_status: "completed",
            transcribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", options.audioSessionId)

        if (updateError) {
          throw updateError
        }

        return {
          success: true,
          transcription: data.transcription,
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao transcrever áudio"
        setError(errorMessage)

        // Update status to failed
        await supabase
          .from("audio_sessions")
          .update({
            transcription_status: "failed",
            transcription_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", options.audioSessionId)

        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setTranscribing(false)
      }
    },
    []
  )

  const getTranscription = React.useCallback(async (audioSessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("audio_sessions")
        .select("transcription, transcription_status")
        .eq("id", audioSessionId)
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar transcrição")
      return null
    }
  }, [])

  return {
    transcribeAudio,
    getTranscription,
    transcribing,
    error,
  }
}
