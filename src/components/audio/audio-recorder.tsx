"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAudioUpload } from "@/hooks/use-audio-upload"
import { useAudioTranscription } from "@/hooks/use-audio-transcription"

export interface AudioRecorderProps {
  patientId: string
  appointmentId?: string
  onTranscriptionComplete?: (transcription: string) => void
}

export function AudioRecorder({ patientId, appointmentId, onTranscriptionComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = React.useState(false)
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const [audioSessionId, setAudioSessionId] = React.useState<string | null>(null)
  const [duration, setDuration] = React.useState(0)
  const [transcription, setTranscription] = React.useState<string>("")

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const { uploadAudio, uploading, progress, error: uploadError } = useAudioUpload()
  const { transcribeAudio, transcribing, error: transcribeError } = useAudioTranscription()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error("Error starting recording:", err)
      alert("Erro ao iniciar gravação. Verifique as permissões do microfone.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleUpload = async () => {
    if (!audioBlob) return

    // Convert blob to file
    const file = new File([audioBlob], `recording-${Date.now()}.webm`, {
      type: "audio/webm",
    })

    const result = await uploadAudio(file, {
      patientId,
      appointmentId,
    })

    if (result.success && result.audioUrl) {
      setAudioSessionId(result.audioUrl) // We'll need to get the actual session ID
      // Auto-start transcription
      handleTranscribe(result.audioUrl)
    }
  }

  const handleTranscribe = async (url: string) => {
    if (!audioSessionId && !url) return

    const result = await transcribeAudio(url || audioUrl!, {
      audioSessionId: audioSessionId || url,
      language: "pt",
    })

    if (result.success && result.transcription) {
      setTranscription(result.transcription)
      onTranscriptionComplete?.(result.transcription)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setAudioSessionId(null)
    setDuration(0)
    setTranscription("")
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Gravação de Áudio</h3>
          {duration > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="material-symbols-outlined text-base">schedule</span>
              {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex gap-2">
          {!isRecording && !audioBlob && (
            <Button onClick={startRecording} className="flex-1">
              <span className="material-symbols-outlined text-lg mr-2">mic</span>
              Iniciar Gravação
            </Button>
          )}

          {isRecording && (
            <Button onClick={stopRecording} variant="destructive" className="flex-1">
              <span className="material-symbols-outlined text-lg mr-2">stop_circle</span>
              Parar Gravação
            </Button>
          )}

          {audioBlob && !uploading && (
            <>
              <Button onClick={handleUpload} className="flex-1">
                <span className="material-symbols-outlined text-lg mr-2">cloud_upload</span>
                Fazer Upload
              </Button>
              <Button onClick={handleDiscard} variant="outline">
                <span className="material-symbols-outlined text-lg mr-2">delete</span>
                Descartar
              </Button>
            </>
          )}
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="space-y-2">
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Fazendo upload...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Transcription Status */}
        {transcribing && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            Transcrevendo áudio...
          </div>
        )}

        {/* Transcription Result */}
        {transcription && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
              <span className="font-medium text-sm text-gray-900">Transcrição Concluída</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcription}</p>
            </div>
          </div>
        )}

        {/* Errors */}
        {(uploadError || transcribeError) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 text-base">error</span>
              <p className="text-sm text-red-600">{uploadError || transcribeError}</p>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-red-600 animate-pulse">
            <div className="size-2 bg-red-600 rounded-full animate-pulse" />
            Gravando...
          </div>
        )}
      </div>
    </Card>
  )
}
