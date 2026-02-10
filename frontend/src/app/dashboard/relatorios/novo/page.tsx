"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useReportMutations, useReport, usePatients, useAudioUpload, useAudioTranscription } from "@/hooks"
import type { ReportType } from "@/lib/core"

const TYPE_CONFIG: Record<string, { label: string; description: string; icon: string; color: string; bg: string }> = {
  evolution: { label: "Evolução", description: "Registro de evolução da sessão", icon: "psychology", color: "text-[#820AD1]", bg: "bg-[#820AD1]/10" },
  evaluation: { label: "Avaliação", description: "Avaliação fonoaudiológica inicial", icon: "assignment", color: "text-blue-500", bg: "bg-blue-50" },
  discharge: { label: "Alta", description: "Relatório de alta do tratamento", icon: "task_alt", color: "text-green-500", bg: "bg-green-50" },
  monthly: { label: "Mensal", description: "Resumo mensal do tratamento", icon: "calendar_month", color: "text-purple-500", bg: "bg-purple-50" },
}

const TEMPLATES: Record<string, { sections: { title: string; placeholder: string }[] }> = {
  evolution: {
    sections: [
      { title: "Objetivos da Sessão", placeholder: "Descreva os objetivos trabalhados nesta sessão..." },
      { title: "Atividades Realizadas", placeholder: "Liste as atividades e técnicas utilizadas..." },
      { title: "Resposta do Paciente", placeholder: "Como o paciente respondeu às atividades..." },
      { title: "Observações Clínicas", placeholder: "Observações relevantes sobre o comportamento, engajamento..." },
      { title: "Planejamento Próxima Sessão", placeholder: "Objetivos e atividades planejadas para a próxima sessão..." },
    ],
  },
  evaluation: {
    sections: [
      { title: "Queixa Principal", placeholder: "Motivo da consulta e queixa relatada pelo paciente/responsável..." },
      { title: "Histórico", placeholder: "Histórico clínico, desenvolvimento, antecedentes relevantes..." },
      { title: "Avaliação", placeholder: "Resultados dos testes e avaliações realizadas..." },
      { title: "Diagnóstico Fonoaudiológico", placeholder: "Diagnóstico baseado nos achados da avaliação..." },
      { title: "Prognóstico", placeholder: "Expectativa de evolução do quadro clínico..." },
      { title: "Plano Terapêutico", placeholder: "Objetivos terapêuticos, frequência e abordagem proposta..." },
    ],
  },
  discharge: {
    sections: [
      { title: "Resumo do Tratamento", placeholder: "Período de tratamento, número de sessões, abordagens utilizadas..." },
      { title: "Objetivos Alcançados", placeholder: "Objetivos terapêuticos atingidos durante o tratamento..." },
      { title: "Orientações Finais", placeholder: "Orientações para manutenção dos resultados..." },
      { title: "Recomendações", placeholder: "Recomendações para acompanhamento futuro..." },
    ],
  },
  monthly: {
    sections: [
      { title: "Período", placeholder: "Mês/ano de referência do relatório..." },
      { title: "Resumo das Sessões", placeholder: "Quantidade de sessões, frequência, faltas..." },
      { title: "Evolução Observada", placeholder: "Progressos e mudanças observadas no período..." },
      { title: "Objetivos em Andamento", placeholder: "Status dos objetivos terapêuticos atuais..." },
      { title: "Planejamento do Próximo Mês", placeholder: "Metas e estratégias para o próximo período..." },
    ],
  },
}

function getTitleSuggestion(type: string, patientName: string) {
  const today = new Date().toLocaleDateString("pt-BR")
  const suggestions: Record<string, string> = {
    evolution: `Evolução - ${patientName} - ${today}`,
    evaluation: `Avaliação Fonoaudiológica - ${patientName}`,
    discharge: `Relatório de Alta - ${patientName}`,
    monthly: `Relatório Mensal - ${patientName} - ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
  }
  return suggestions[type] || `Relatório - ${patientName} - ${today}`
}

function sectionsToContent(sections: { title: string; content: string }[]): string {
  return sections.map((s) => `## ${s.title}\n${s.content}`).join("\n\n")
}

function contentToSections(content: string, type: string): { title: string; content: string }[] {
  const template = TEMPLATES[type]
  if (!content || !content.trim()) {
    return template ? template.sections.map((s) => ({ title: s.title, content: "" })) : [{ title: "Conteúdo", content: "" }]
  }
  const sections: { title: string; content: string }[] = []
  const lines = content.split("\n")
  let currentTitle = ""
  let currentContent: string[] = []
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/)
    if (match) {
      if (currentTitle) sections.push({ title: currentTitle, content: currentContent.join("\n").trim() })
      currentTitle = match[1].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, content: currentContent.join("\n").trim() })
  return sections.length > 0 ? sections : [{ title: "Conteúdo", content: content.trim() }]
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-[#820AD1]/10 p-2 rounded-xl text-[#820AD1]">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    </div>
  )
}

function NovoRelatorioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedPatientId = searchParams.get("patientId")
  const preFilledContent = searchParams.get("content")
  const editReportId = searchParams.get("reportId")

  const { createReport, updateReport, isCreating, isUpdating } = useReportMutations()
  const { report: existingReport, loading: reportLoading } = useReport(editReportId || "")
  const { patients, loading: patientsLoading } = usePatients({ limit: 100 })
  const { uploadAudio, uploading } = useAudioUpload()
  const { createSession, transcribeAudio, transcribing } = useAudioTranscription()

  const [error, setError] = React.useState<string | null>(null)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [initialized, setInitialized] = React.useState(false)

  // Audio recording state
  const [isRecording, setIsRecording] = React.useState(false)
  const [recordingTime, setRecordingTime] = React.useState(0)
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const [processingAudio, setProcessingAudio] = React.useState(false)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = React.useState({
    patientId: preSelectedPatientId || "",
    type: "evolution" as ReportType,
    title: "",
  })

  const [sections, setSections] = React.useState<{ title: string; content: string }[]>(
    TEMPLATES.evolution.sections.map((s) => ({ title: s.title, content: "" }))
  )

  // Initialize from existing report (edit mode)
  React.useEffect(() => {
    if (editReportId && existingReport && !initialized) {
      setIsEditMode(true)
      setFormData({
        patientId: existingReport.patientId,
        type: existingReport.type as ReportType,
        title: existingReport.title,
      })
      setSections(contentToSections(existingReport.content || "", existingReport.type))
      setInitialized(true)
    }
  }, [editReportId, existingReport, initialized])

  // Initialize from pre-filled content
  React.useEffect(() => {
    if (preFilledContent && !initialized && !editReportId) {
      setSections(contentToSections(preFilledContent, formData.type))
      setInitialized(true)
    }
  }, [preFilledContent, initialized, editReportId, formData.type])

  const updateField = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (type: ReportType) => {
    updateField("type", type)
    const hasContent = sections.some((s) => s.content.trim())
    if (!hasContent) {
      const template = TEMPLATES[type]
      setSections(template ? template.sections.map((s) => ({ title: s.title, content: "" })) : [{ title: "Conteúdo", content: "" }])
    }
  }

  const handlePatientChange = (patientId: string) => {
    updateField("patientId", patientId)
    const patient = patients.find((p) => p.id === patientId)
    if (patient && !formData.title) {
      updateField("title", getTitleSuggestion(formData.type, patient.name))
    }
  }

  const updateSection = (index: number, content: string) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, content } : s)))
  }

  const selectedPatient = patients.find((p) => p.id === formData.patientId)
  const isSaving = isCreating || isUpdating
  const fullContent = sectionsToContent(sections)
  const canSubmit = formData.patientId && formData.title && sections.some((s) => s.content.trim()) && !isSaving

  /* ─── Audio Recording ─── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000)
    } catch {
      setError("Erro ao acessar microfone. Verifique as permissões.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
  }

  const handleTranscribe = async () => {
    if (!audioBlob || !formData.patientId) return
    setProcessingAudio(true)
    setError(null)
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
      const uploadResult = await uploadAudio(file, { patientId: formData.patientId })
      if (!uploadResult.success || !uploadResult.audioUrl) throw new Error(uploadResult.error || "Erro no upload")

      const session = await createSession({ patientId: formData.patientId, audioUrl: uploadResult.audioUrl, fileSize: audioBlob.size, audioDuration: recordingTime })
      if (!session) throw new Error("Erro ao criar sessão de áudio")

      const result = await transcribeAudio(uploadResult.audioUrl, session.id, "pt")
      if (result.success && result.transcription) {
        // Distribute transcription into sections intelligently
        const transcribedSections = contentToSections(result.transcription, formData.type)
        if (transcribedSections.length === 1 && transcribedSections[0].title === "Conteúdo") {
          // Raw transcription — put into first empty section or first section
          const firstEmpty = sections.findIndex((s) => !s.content.trim())
          if (firstEmpty >= 0) updateSection(firstEmpty, result.transcription)
          else updateSection(0, sections[0].content + "\n\n" + result.transcription)
        } else {
          setSections(transcribedSections)
        }
        discardRecording()
      } else {
        setError(result.error || "Erro na transcrição")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar áudio")
    } finally {
      setProcessingAudio(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`
  const isProcessing = processingAudio || uploading || transcribing

  /* ─── Submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (isEditMode && editReportId) {
        await updateReport({ id: editReportId, title: formData.title, content: fullContent })
      } else {
        await createReport({ patientId: formData.patientId, type: formData.type, title: formData.title, content: fullContent })
      }
      router.push("/dashboard/relatorios")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar relatório")
    }
  }

  const inputClass = "h-11 rounded-xl border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all"
  const labelClass = "text-xs font-bold text-gray-500 uppercase tracking-wide"

  if (editReportId && reportLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
          <span className="text-sm font-medium">Carregando relatório...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-6">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 flex flex-col gap-5 sm:gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {isEditMode ? "Editar Relatório" : "Novo Relatório"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {isEditMode ? "Edite o conteúdo do relatório clínico." : "Crie um novo documento clínico para seu paciente."}
            </p>
          </div>
          <Link href="/dashboard/relatorios">
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#820AD1] transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Voltar
            </button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

            {/* Left Column */}
            <div className="flex flex-col gap-5 sm:gap-6">

              {/* Patient Selection */}
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4">
                <SectionTitle icon="person" title="Paciente" />
                {patientsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-gray-400">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span className="text-sm">Carregando pacientes...</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="patientId" className={labelClass}>Selecione o paciente *</label>
                    <select
                      id="patientId"
                      value={formData.patientId}
                      onChange={(e) => handlePatientChange(e.target.value)}
                      required
                      disabled={isEditMode}
                      className={`w-full px-3 border ${inputClass} ${isEditMode ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <option value="">Selecione um paciente</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>{patient.name}</option>
                      ))}
                    </select>
                    {selectedPatient && (
                      <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-[#820AD1]/5 rounded-xl">
                        <div className="w-7 h-7 rounded-full bg-[#820AD1]/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#820AD1] text-[14px]">person</span>
                        </div>
                        <span className="text-xs font-medium text-[#820AD1]">{selectedPatient.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Report Type */}
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4">
                <SectionTitle icon="category" title="Tipo de Relatório" />
                <div className="flex flex-col gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const isActive = formData.type === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTypeChange(key as ReportType)}
                        disabled={isEditMode}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          isActive ? "border-[#820AD1] bg-[#820AD1]/5 shadow-sm shadow-[#820AD1]/10" : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
                        } ${isEditMode ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className={`w-9 h-9 rounded-xl ${isActive ? "bg-[#820AD1]/10" : cfg.bg} flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined ${isActive ? "text-[#820AD1]" : cfg.color} text-[18px]`}>{cfg.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${isActive ? "text-[#820AD1]" : "text-gray-900"}`}>{cfg.label}</p>
                          <p className="text-[11px] text-gray-500 leading-tight">{cfg.description}</p>
                        </div>
                        {isActive && <span className="material-symbols-outlined text-[#820AD1] text-[18px] ml-auto shrink-0">check_circle</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Audio Recording */}
              {formData.patientId && !isEditMode && (
                <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4">
                  <SectionTitle icon="mic" title="Gravar Relatório" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Grave sua voz e a transcrição será distribuída automaticamente nas seções do relatório.
                  </p>

                  {!isRecording && !audioBlob && !isProcessing && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#820AD1] text-white font-bold text-sm shadow-lg shadow-[#820AD1]/20 hover:bg-[#6D08AF] transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">mic</span>
                      Iniciar Gravação
                    </button>
                  )}

                  {isRecording && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 text-red-500">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-2xl font-bold tabular-nums">{formatTime(recordingTime)}</span>
                      </div>
                      <div className="flex items-center gap-1 h-8 w-full justify-center">
                        {Array.from({ length: 20 }, (_, i) => (
                          <div key={i} className="w-1 bg-[#820AD1] rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.05}s` }} />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">stop_circle</span>
                        Parar Gravação
                      </button>
                    </div>
                  )}

                  {audioBlob && !isProcessing && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                        Áudio gravado ({formatTime(recordingTime)})
                      </div>
                      {audioUrl && <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleTranscribe}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#820AD1] text-white font-bold text-xs shadow-lg shadow-[#820AD1]/20 hover:bg-[#6D08AF] transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                          Transcrever
                        </button>
                        <button
                          type="button"
                          onClick={discardRecording}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Descartar
                        </button>
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex items-center gap-2 py-3 px-4 bg-[#820AD1]/5 rounded-xl">
                      <span className="material-symbols-outlined animate-spin text-[#820AD1] text-[18px]">progress_activity</span>
                      <span className="text-xs font-medium text-[#820AD1]">
                        {uploading ? "Enviando áudio..." : transcribing ? "Transcrevendo com IA..." : "Processando..."}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tips */}
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 border-l-4 border-l-[#820AD1]/30">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#820AD1] text-[18px]">lightbulb</span>
                  <span className="text-xs font-bold text-gray-700">Dicas</span>
                </div>
                <ul className="text-[11px] text-gray-500 space-y-1.5 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[12px] mt-0.5 text-gray-400">check</span>
                    Preencha cada seção do relatório individualmente
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[12px] mt-0.5 text-gray-400">check</span>
                    Use a gravação de áudio para preencher automaticamente
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[12px] mt-0.5 text-gray-400">check</span>
                    O template muda conforme o tipo de relatório selecionado
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column - Structured Content */}
            <div className="lg:col-span-2 flex flex-col gap-5 sm:gap-6">

              {/* Title */}
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4">
                <SectionTitle icon="title" title="Título" />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="title" className={labelClass}>Título do relatório *</label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Ex: Relatório de Evolução - João Silva"
                    required
                    className={`w-full px-4 border ${inputClass}`}
                  />
                  {selectedPatient && !formData.title && (
                    <button
                      type="button"
                      onClick={() => updateField("title", getTitleSuggestion(formData.type, selectedPatient.name))}
                      className="flex items-center gap-1.5 text-xs text-[#820AD1] hover:text-[#6D08AF] font-medium mt-0.5 transition-colors self-start"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                      Usar sugestão: {getTitleSuggestion(formData.type, selectedPatient.name)}
                    </button>
                  )}
                </div>
              </div>

              {/* Structured Sections */}
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <SectionTitle icon="edit_note" title="Conteúdo do Relatório" />
                  <div className="flex items-center gap-2">
                    {sections.some((s) => s.content.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          const template = TEMPLATES[formData.type]
                          if (template) setSections(template.sections.map((s) => ({ title: s.title, content: "" })))
                        }}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#820AD1] font-medium transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Section progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#820AD1] rounded-full transition-all duration-300"
                      style={{ width: `${(sections.filter((s) => s.content.trim()).length / sections.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium shrink-0">
                    {sections.filter((s) => s.content.trim()).length}/{sections.length} seções
                  </span>
                </div>

                {/* Individual sections */}
                {sections.map((section, index) => {
                  const template = TEMPLATES[formData.type]
                  const placeholder = template?.sections[index]?.placeholder || "Digite o conteúdo desta seção..."
                  const isFilled = section.content.trim().length > 0
                  return (
                    <div key={index} className={`rounded-xl border-2 transition-all ${isFilled ? "border-[#820AD1]/20 bg-purple-50/30" : "border-gray-100 bg-white"}`}>
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100/50">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isFilled ? "bg-[#820AD1] text-white" : "bg-gray-100 text-gray-400"}`}>
                          {isFilled ? "✓" : index + 1}
                        </span>
                        <span className={`text-sm font-bold ${isFilled ? "text-[#820AD1]" : "text-gray-700"}`}>{section.title}</span>
                        {isFilled && (
                          <span className="text-[10px] text-gray-400 ml-auto">{section.content.length} caracteres</span>
                        )}
                      </div>
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSection(index, e.target.value)}
                        placeholder={placeholder}
                        rows={4}
                        className="w-full px-4 py-3 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-y min-h-[80px]"
                      />
                    </div>
                  )
                })}

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    Cada seção segue a estrutura padrão do tipo &ldquo;{TYPE_CONFIG[formData.type]?.label}&rdquo;
                  </p>
                  {fullContent && (
                    <p className="text-[11px] text-gray-400">{fullContent.length} caracteres total</p>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                  <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <Link href="/dashboard/relatorios" className="sm:order-1">
                  <button type="button" className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-5 h-10 border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                </Link>
                <div className="flex items-center gap-3 sm:order-2">
                  {!isEditMode && (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-full px-5 h-10 border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">draft</span>
                      Salvar Rascunho
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#820AD1] hover:bg-[#6D08AF] text-white rounded-full px-6 h-10 font-bold text-sm shadow-lg shadow-[#820AD1]/20 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {isSaving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        {isEditMode ? "Salvar Alterações" : "Criar Relatório"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NovoRelatorioPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      </div>
    }>
      <NovoRelatorioContent />
    </Suspense>
  )
}
