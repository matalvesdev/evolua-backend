"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase/client"

export interface AudioUploadOptions {
  patientId: string
  appointmentId?: string
  onProgress?: (progress: number) => void
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
        // Validate file type
        if (!file.type.startsWith("audio/")) {
          throw new Error("O arquivo deve ser um áudio válido")
        }

        // Validate file size (max 100MB)
        const maxSize = 100 * 1024 * 1024
        if (file.size > maxSize) {
          throw new Error("O arquivo não pode ser maior que 100MB")
        }

        // Generate unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${options.patientId}/${Date.now()}.${fileExt}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio-sessions")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("audio-sessions").getPublicUrl(uploadData.path)

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("Usuário não autenticado")
        }

        // Get user's clinic_id
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("id", user.id)
          .single()

        if (userError || !userData?.clinic_id) {
          throw new Error("Clínica não encontrada")
        }

        // Create audio session record
        const { data: _sessionData, error: sessionError } = await supabase
          .from("audio_sessions")
          .insert({
            clinic_id: userData.clinic_id,
            patient_id: options.patientId,
            appointment_id: options.appointmentId,
            therapist_id: user.id,
            audio_url: publicUrl,
            file_size: file.size,
            transcription_status: "pending",
          })
          .select()
          .single()

        if (sessionError) {
          throw sessionError
        }

        setProgress(100)
        setUploading(false)

        return {
          success: true,
          audioUrl: publicUrl,
        }
      } catch (err) {
        console.error("Audio upload error:", err)
        const errorMessage = err instanceof Error ? err.message : "Erro ao fazer upload do áudio"
        setError(errorMessage)
        setUploading(false)

        return {
          success: false,
          error: errorMessage,
        }
      }
    },
    []
  )

  const deleteAudio = React.useCallback(async (audioUrl: string): Promise<boolean> => {
    try {
      // Extract file path from URL
      const path = audioUrl.split("/audio-sessions/")[1]
      if (!path) {
        throw new Error("URL inválida")
      }

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("audio-sessions")
        .remove([path])

      if (deleteError) {
        throw deleteError
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("audio_sessions")
        .delete()
        .eq("audio_url", audioUrl)

      if (dbError) {
        throw dbError
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar áudio")
      return false
    }
  }, [])

  return {
    uploadAudio,
    deleteAudio,
    uploading,
    progress,
    error,
  }
}
