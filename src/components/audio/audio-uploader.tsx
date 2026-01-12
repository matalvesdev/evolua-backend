"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAudioUpload } from "@/hooks/use-audio-upload"
import { useAudioTranscription } from "@/hooks/use-audio-transcription"

export interface AudioUploaderProps {
  patientId: string
  appointmentId?: string
  onTranscriptionComplete?: (transcription: string) => void
}

export function AudioUploader({ patientId, appointmentId, onTranscriptionComplete }: AudioUploaderProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const [audioSessionId, setAudioSessionId] = React.useState<string | null>(null)
  const [transcription, setTranscription] = React.useState<string>("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { uploadAudio, uploading, progress, error: uploadError } = useAudioUpload()
  const { transcribeAudio, transcribing, error: transcribeError } = useAudioTranscription()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("audio/")) {
        alert("Por favor, selecione um arquivo de áudio válido")
        return
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        alert("O arquivo não pode ser maior que 100MB")
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const result = await uploadAudio(selectedFile, {
      patientId,
      appointmentId,
    })

    if (result.success && result.audioUrl) {
      setAudioSessionId(result.audioUrl)
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

  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setSelectedFile(null)
    setAudioUrl(null)
    setAudioSessionId(null)
    setTranscription("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Upload de Áudio</h3>

        {/* File Input */}
        {!selectedFile && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              id="audio-file-input"
            />
            <label htmlFor="audio-file-input">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-purple-50/50 transition-colors">
                <span className="material-symbols-outlined text-5xl text-gray-400 mb-2">
                  audio_file
                </span>
                <p className="text-sm text-gray-600 mb-1">
                  Clique para selecionar um arquivo de áudio
                </p>
                <p className="text-xs text-gray-500">MP3, WAV, M4A, OGG (máx. 100MB)</p>
              </div>
            </label>
          </div>
        )}

        {/* Selected File Info */}
        {selectedFile && !uploading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="material-symbols-outlined text-gray-600">audio_file</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            {audioUrl && (
              <audio src={audioUrl} controls className="w-full" />
            )}

            <div className="flex gap-2">
              <Button onClick={handleUpload} className="flex-1">
                <span className="material-symbols-outlined text-lg mr-2">cloud_upload</span>
                Fazer Upload e Transcrever
              </Button>
              <Button onClick={handleDiscard} variant="outline">
                <span className="material-symbols-outlined text-lg mr-2">close</span>
                Cancelar
              </Button>
            </div>
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
          <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            Transcrevendo áudio com IA...
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(transcription)
                alert("Transcrição copiada para a área de transferência!")
              }}
            >
              <span className="material-symbols-outlined text-base mr-2">content_copy</span>
              Copiar Transcrição
            </Button>
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
      </div>
    </Card>
  )
}
