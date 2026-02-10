"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { AudioRecorder, AudioUploader } from "@/components/audio"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AudioSessionPage() {
  const params = useParams()
  const patientId = params.id as string
  const appointmentId = params.appointmentId as string | undefined

  const [transcriptions, setTranscriptions] = React.useState<string[]>([])

  const handleTranscriptionComplete = (transcription: string) => {
    setTranscriptions((prev) => [...prev, transcription])
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sessão de Áudio</h1>
        <p className="text-gray-500 mt-1">
          Grave ou faça upload de áudios e obtenha transcrições automáticas com IA
        </p>
      </div>

      {/* Tabs for Recording vs Upload */}
      <Tabs defaultValue="record" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="record">
            <span className="material-symbols-outlined text-base mr-2">mic</span>
            Gravar Áudio
          </TabsTrigger>
          <TabsTrigger value="upload">
            <span className="material-symbols-outlined text-base mr-2">upload_file</span>
            Upload de Arquivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="space-y-6">
          <AudioRecorder
            patientId={patientId}
            appointmentId={appointmentId}
            onTranscriptionComplete={handleTranscriptionComplete}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <AudioUploader
            patientId={patientId}
            appointmentId={appointmentId}
            onTranscriptionComplete={handleTranscriptionComplete}
          />
        </TabsContent>
      </Tabs>

      {/* All Transcriptions */}
      {transcriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Transcrições desta Sessão ({transcriptions.length})
          </h2>
          <div className="space-y-3">
            {transcriptions.map((text, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-base">
                    record_voice_over
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    Transcrição #{index + 1}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-blue-600">info</span>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-1">Como funciona</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • <strong>Gravação:</strong> Grave áudios diretamente pelo navegador usando seu
                microfone
              </li>
              <li>
                • <strong>Upload:</strong> Envie arquivos de áudio existentes (MP3, WAV, M4A, OGG)
              </li>
              <li>
                • <strong>Armazenamento:</strong> Os áudios são salvos de forma segura no Supabase
                Storage
              </li>
              <li>
                • <strong>Transcrição:</strong> IA do Hugging Face (Whisper) converte
                automaticamente o áudio em texto
              </li>
              <li>
                • <strong>Uso:</strong> Utilize as transcrições para criar relatórios e
                documentações
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
