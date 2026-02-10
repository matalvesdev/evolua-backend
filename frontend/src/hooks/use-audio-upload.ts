"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"

export interface AudioUploadOptions {
  patientId: string
  appointmentId?: string
}

export interface AudioUploadResult {
  success: boolean
  audioUrl?: string
  error?: string
}

export function useAudioUpload() {
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const uploadAudio = React.useCallback(
    async (file: File, options: AudioUploadOptions): Promise<AudioUploadResult> => {
      setUploading(true)
      setProgress(0)
      setError(null)

      try {
        if (!file.type.startsWith("audio/")) {
          throw new Error("O arquivo deve ser um áudio válido")
        }

        const maxSize = 100 * 1024 * 1024
        if (file.size > maxSize) {
          throw new Error("O arquivo não pode ser maior que 100MB")
        }

        const supabase = createClient()
        const fileExt = file.name.split(".").pop()
        const fileName = `${options.patientId}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio-sessions")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          })

        if (uploadError) {
          if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("not found")) {
            throw new Error(
              'O bucket "audio-sessions" não existe no Supabase. Execute o script SQL de setup (backend/prisma/setup-storage-bucket.sql) no Supabase Dashboard.'
            )
          }
          throw new Error(uploadError.message || "Erro ao fazer upload do áudio")
        }

        const { data: { publicUrl } } = supabase.storage
          .from("audio-sessions")
          .getPublicUrl(uploadData.path)

        setProgress(100)
        return { success: true, audioUrl: publicUrl }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao fazer upload do áudio"
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setUploading(false)
      }
    },
    []
  )

  const deleteAudio = React.useCallback(async (audioUrl: string): Promise<boolean> => {
    try {
      const path = audioUrl.split("/audio-sessions/")[1]
      if (!path) throw new Error("URL inválida")

      const supabase = createClient()
      const { error } = await supabase.storage.from("audio-sessions").remove([path])
      if (error) throw error
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar áudio")
      return false
    }
  }, [])

  return { uploadAudio, deleteAudio, uploading, progress, error }
}
