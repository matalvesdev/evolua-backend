"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePatients, usePatient } from "@/hooks/use-patients"
import { useAudioUpload } from "@/hooks/use-audio-upload"
import { useAudioTranscription } from "@/hooks/use-audio-transcription"
import { useReportMutations } from "@/hooks/use-reports"
import { AudioRecorderPanel } from "@/components/audio-recorder"
import { AudioTranscriptionReviewModal } from "@/components/audio"

interface NewReportModalProps {
  open: boolean
  onClose: () => void
}

export function NewReportModal({ open, onClose }: NewReportModalProps) {
  const router = useRouter()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const { patients } = usePatients({ limit: 100 })
  const { patient } = usePatient(selectedPatientId || "")
  const { uploadAudio, uploading } = useAudioUpload()
  const { transcribeAudio, createSession, transcribing } = useAudioTranscription()
  const { createReport } = useReportMutations()

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)

  const filteredPatients = React.useMemo(() => {
    if (!search.trim()) return patients
    const q = search.toLowerCase()
    return patients.filter((p) => p.name.toLowerCase().includes(q))
  }, [patients, search])

  const patientName = patient?.name || "Carregando..."

  const resetAndClose = () => {
    setSelectedPatientId(null)
    setSearch("")
    setTranscription("")
    setIsReviewOpen(false)
    setProcessing(false)
    setSaving(false)
    onClose()
  }

  const handleSave = async (audioBlob: Blob, duration: number) => {
    if (!selectedPatientId) return
    setProcessing(true)
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
      const uploadResult = await uploadAudio(file, { patientId: selectedPatientId })
      if (!uploadResult.success || !uploadResult.audioUrl) {
        throw new Error(uploadResult.error || "Erro no upload")
      }
      const session = await createSession({
        patientId: selectedPatientId,
        audioUrl: uploadResult.audioUrl,
        fileSize: audioBlob.size,
        audioDuration: duration,
      })
      if (!session) throw new Error("Erro ao criar sessão de áudio")
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

  const handleReviewSave = async (data: { template: string; content: string }) => {
    if (!selectedPatientId) return
    setSaving(true)
    try {
      await createReport({
        patientId: selectedPatientId,
        type: "evolution",
        content: data.content,
      })
      setIsReviewOpen(false)
      resetAndClose()
      router.push(`/dashboard/pacientes/${selectedPatientId}`)
    } catch (err) {
      console.error("Error creating report:", err)
      alert(err instanceof Error ? err.message : "Erro ao salvar relatório")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  // Step 1: Patient selection
  if (!selectedPatientId) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gravar Relatório de Evolução</h2>
              <p className="text-sm text-gray-500">Selecione o paciente para iniciar a gravação</p>
            </div>
            <button onClick={resetAndClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar paciente..."
                className="w-full h-10 pl-10 pr-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8A05BE]/30 focus:border-[#8A05BE]"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredPatients.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum paciente encontrado</p>
              ) : (
                filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#8A05BE]/5 transition-colors text-left"
                  >
                    <span className="w-8 h-8 rounded-full bg-[#8A05BE]/10 flex items-center justify-center text-[#8A05BE] text-sm font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={resetAndClose}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Audio recording (replicates the novo-relatorio page layout)
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-[#F9F8FA] dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Panel - Illustration */}
        <section className="relative w-full md:w-1/2 h-48 md:h-auto bg-linear-to-br from-[#8A05BE]/5 via-[#8A05BE]/10 to-[#8A05BE]/20 overflow-hidden flex items-center justify-center p-8">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#8A05BE]/15 rounded-full blur-[80px]" />
          <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/80 flex items-center justify-center shadow-xl">
              <span className="material-symbols-outlined text-[#8A05BE] text-5xl">mic</span>
            </div>
            <h2 className="text-3xl font-bold text-[#2d1b36] leading-tight">Fluxo Criativo</h2>
            <p className="text-lg text-gray-700">
              Transforme sua voz em relatórios estruturados instantaneamente.
            </p>
            {(processing || uploading || transcribing || saving) && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg flex items-center gap-3">
                <span className="material-symbols-outlined animate-spin text-[#8A05BE]">progress_activity</span>
                <span className="text-sm font-medium text-gray-700">
                  {uploading ? "Enviando áudio..." : transcribing ? "Transcrevendo com IA..." : saving ? "Salvando relatório..." : "Processando..."}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel - Recorder */}
        <section className="relative w-full md:w-1/2 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto max-h-[70vh] md:max-h-none">
          <AudioRecorderPanel
            patientName={patientName}
            onBack={() => setSelectedPatientId(null)}
            onSave={handleSave}
            onCancel={resetAndClose}
          />
        </section>
      </div>

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
