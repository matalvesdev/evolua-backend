"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { usePatient } from "@/hooks/use-patients"
import { useAudioUpload } from "@/hooks/use-audio-upload"
import { useAudioTranscription } from "@/hooks/use-audio-transcription"
import { useReportMutations } from "@/hooks/use-reports"
import { AudioRecorderPanel } from "@/components/audio-recorder"
import { AudioTranscriptionReviewModal } from "@/components/audio"

interface NewReportPageProps {
  params: Promise<{ id: string }>
}

export default function NewReportPage({ params }: NewReportPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { patient, loading } = usePatient(id)
  const { uploadAudio, uploading } = useAudioUpload()
  const { transcribeAudio, createSession, transcribing } = useAudioTranscription()
  const { createReport } = useReportMutations()

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)

  const patientName = patient?.name || "Carregando..."

  const handleBack = () => {
    router.back()
  }

  const handleSave = async (audioBlob: Blob, duration: number) => {
    setProcessing(true)
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
      const uploadResult = await uploadAudio(file, { patientId: id })

      if (!uploadResult.success || !uploadResult.audioUrl) {
        throw new Error(uploadResult.error || "Erro no upload")
      }

      const session = await createSession({
        patientId: id,
        audioUrl: uploadResult.audioUrl,
        fileSize: audioBlob.size,
        audioDuration: duration,
      })

      if (!session) {
        throw new Error("Erro ao criar sessão de áudio")
      }

      const transcribeResult = await transcribeAudio(uploadResult.audioUrl, session.id, "pt")

      if (transcribeResult.success && transcribeResult.transcription) {
        setTranscription(transcribeResult.transcription)
        setIsReviewOpen(true)
      } else {
        alert(transcribeResult.error || "Erro ao transcrever áudio")
      }
    } catch (err) {
      console.error("Error processing audio:", err)
      alert(err instanceof Error ? err.message : "Erro ao processar áudio")
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = () => {
    router.push(`/dashboard/pacientes/${id}`)
  }

  const handleReviewSave = async (data: { template: string; content: string }) => {
    setSaving(true)
    try {
      await createReport({
        patientId: id,
        type: "evolution",
        content: data.content,
      })
      setIsReviewOpen(false)
      router.push(`/dashboard/pacientes/${id}`)
    } catch (err) {
      console.error("Error creating report:", err)
      alert(err instanceof Error ? err.message : "Erro ao salvar relatório")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col md:flex-row bg-[#F9F8FA]">
      {/* Left Panel - Illustration */}
      <section className="relative w-full md:w-1/2 h-1/3 md:h-full bg-linear-to-br from-[#8A05BE]/5 via-[#8A05BE]/10 to-[#8A05BE]/20 overflow-hidden flex items-center justify-center p-8">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#8A05BE]/15 rounded-full blur-[80px]" />

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-white/80 flex items-center justify-center shadow-xl">
            <span className="material-symbols-outlined text-primary text-5xl">mic</span>
          </div>
          <h2 className="text-3xl font-bold text-[#2d1b36] leading-tight">Fluxo Criativo</h2>
          <p className="text-lg text-gray-700">
            Transforme sua voz em relatórios estruturados instantaneamente.
          </p>

          {(processing || uploading || transcribing || saving) && (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg flex items-center gap-3">
              <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              <span className="text-sm font-medium text-gray-700">
                {uploading ? "Enviando áudio..." : transcribing ? "Transcrevendo com IA..." : saving ? "Salvando relatório..." : "Processando..."}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Right Panel - Recorder */}
      <section className="relative w-full md:w-1/2 h-2/3 md:h-full flex flex-col items-center justify-center p-4 md:p-12">
        <AudioRecorderPanel
          patientName={patientName}
          onBack={handleBack}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </section>

      {/* Transcription Review Modal */}
      <AudioTranscriptionReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        transcription={transcription}
        patientName={patientName}
        onSave={handleReviewSave}
      />
    </div>
  )
}
