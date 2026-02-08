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
  const [localAudioUrl, setLocalAudioUrl] = React.useState<string | null>(null)
  const [duration, setDuration] = React.useState(0)
  const [transcription, setTranscription] = React.useState("")
  const [step, setStep] = React.useState<"idle" | "recorded" | "uploading" | "transcribing" | "done" | "error">("idle")
  const [statusMessage, setStatusMessage] = React.useState("")

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const { uploadAudio, uploading, progress, error: uploadError } = useAudioUpload()
  const { createSession, transcribeAudio, transcribing, error: transcribeError } = useAudioTranscription()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        setLocalAudioUrl(URL.createObjectURL(blob))
        setStep("recorded")
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)
      setStep("idle")

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch {
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

  const handleUploadAndTranscribe = async () => {
    if (!audioBlob) return

    // Step 1: Upload to Supabase Storage
    setStep("uploading")
    setStatusMessage("Fazendo upload do áudio...")

    const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
    const uploadResult = await uploadAudio(file, { patientId, appointmentId })

    if (!uploadResult.success || !uploadResult.audioUrl) {
      setStep("error")
      setStatusMessage(uploadResult.error || "Erro no upload")
      return
    }

    // Step 2: Create AudioSession in backend (gets a real UUID)
    setStatusMessage("Criando sessão de áudio...")
    const session = await createSession({
      patientId,
      audioUrl: uploadResult.audioUrl,
      appointmentId,
      fileSize: audioBlob.size,
      audioDuration: duration,
    })

    if (!session) {
      setStep("error")
      setStatusMessage("Erro ao criar sessão de áudio")
      return
    }

    // Step 3: Transcribe using Hugging Face Whisper
    setStep("transcribing")
    setStatusMessage("Transcrevendo áudio com IA (Whisper)...")

    const result = await transcribeAudio(uploadResult.audioUrl, session.id)

    if (result.success && result.transcription) {
      setTranscription(result.transcription)
      setStep("done")
      setStatusMessage("")
      onTranscriptionComplete?.(result.transcription)
    } else {
      setStep("error")
      setStatusMessage(result.error || "Erro na transcrição")
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleDiscard = () => {
    if (localAudioUrl) URL.revokeObjectURL(localAudioUrl)
    setAudioBlob(null)
    setLocalAudioUrl(null)
    setDuration(0)
    setTranscription("")
    setStep("idle")
    setStatusMessage("")
  }

  const displayError = uploadError || transcribeError || (step === "error" ? statusMessage : null)

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Gravação de Áudio</h3>
          {(isRecording || duration > 0) && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="material-symbols-outlined text-base">schedule</span>
              {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex gap-2">
          {!isRecording && step === "idle" && !audioBlob && (
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

          {step === "recorded" && (
            <>
              <Button onClick={handleUploadAndTranscribe} className="flex-1">
                <span className="material-symbols-outlined text-lg mr-2">cloud_upload</span>
                Enviar e Transcrever
              </Button>
              <Button onClick={handleDiscard} variant="outline">
                <span className="material-symbols-outlined text-lg mr-2">delete</span>
                Descartar
              </Button>
            </>
          )}
        </div>

        {/* Audio Player */}
        {localAudioUrl && <audio src={localAudioUrl} controls className="w-full" />}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Fazendo upload...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Transcription Status */}
        {(step === "transcribing" || transcribing) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            {statusMessage || "Transcrevendo áudio com IA..."}
          </div>
        )}

        {/* Transcription Result */}
        {transcription && step === "done" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
              <span className="font-medium text-sm text-gray-900">Transcrição Concluída</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcription}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(transcription)
                  alert("Transcrição copiada!")
                }}
              >
                <span className="material-symbols-outlined text-base mr-2">content_copy</span>
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                Nova Gravação
              </Button>
            </div>
          </div>
        )}

        {/* Errors */}
        {displayError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 text-base">error</span>
              <div>
                <p className="text-sm text-red-600">{displayError}</p>
                {step === "error" && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={handleDiscard}>
                    Tentar novamente
                  </Button>
                )}
              </div>
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
