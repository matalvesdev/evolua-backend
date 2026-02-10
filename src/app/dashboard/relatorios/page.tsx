"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useReports, useReportMutations, usePatient, useCreateMessage, useAppointments, useUser } from "@/hooks"
import { formatPhoneForWhatsApp, buildWhatsAppUrl } from "@/lib/utils/whatsapp-utils"
import { createClient } from "@/lib/supabase/client"
import type { Report } from "@/lib/api/reports"

const ITEMS_PER_PAGE = 10

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: "Rascunho", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  pending_review: { label: "Em Revisão", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  reviewed: { label: "Revisado", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  approved: { label: "Aprovado", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  sent: { label: "Enviado", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  archived: { label: "Arquivado", bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  evolution: { label: "Evolução", icon: "psychology", color: "text-[#820AD1]" },
  evaluation: { label: "Avaliação", icon: "assignment", color: "text-blue-500" },
  discharge: { label: "Alta", icon: "task_alt", color: "text-green-500" },
  monthly: { label: "Mensal", icon: "calendar_month", color: "text-purple-500" },
  progress: { label: "Progresso", icon: "trending_up", color: "text-teal-500" },
  school: { label: "Escolar", icon: "school", color: "text-amber-500" },
  medical: { label: "Médico", icon: "medical_information", color: "text-red-500" },
  custom: { label: "Personalizado", icon: "edit_note", color: "text-gray-500" },
}

const STATUS_TABS = [
  { key: "", label: "Todos", icon: "description" },
  { key: "draft", label: "Rascunhos", dot: "bg-yellow-500" },
  { key: "pending_review", label: "Em Revisão", dot: "bg-orange-500" },
  { key: "approved", label: "Aprovados", dot: "bg-green-500" },
  { key: "sent", label: "Enviados", dot: "bg-emerald-500" },
]

const TYPE_TABS = [
  { key: "", label: "Todos os Tipos" },
  { key: "evolution", label: "Evolução" },
  { key: "evaluation", label: "Avaliação" },
  { key: "discharge", label: "Alta" },
  { key: "monthly", label: "Mensal" },
]

function getStatusInfo(s: string) { return STATUS_CONFIG[s] || STATUS_CONFIG.draft }
function getTypeInfo(t: string) { return TYPE_CONFIG[t] || { label: t, icon: "description", color: "text-gray-500" } }
function formatDate(d: string) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) }
function formatDateShort(d: string) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) }

/* ─── Parse report content into sections ─── */
function parseReportSections(content?: string): { title: string; text: string }[] {
  if (!content?.trim()) return []
  const sections: { title: string; text: string }[] = []
  const lines = content.split("\n")
  let currentTitle = ""
  let currentLines: string[] = []
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/)
    if (match) {
      if (currentTitle) sections.push({ title: currentTitle, text: currentLines.join("\n").trim() })
      currentTitle = match[1].trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, text: currentLines.join("\n").trim() })
  if (sections.length === 0 && content.trim()) sections.push({ title: "", text: content.trim() })
  return sections
}

/* ─── PDF Generation ─── */
async function generateReportPdf(report: Report, therapistName: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 25) {
      doc.addPage()
      y = margin
    }
  }

  // Header bar
  doc.setFillColor(130, 10, 209)
  doc.rect(0, 0, pageW, 28, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("RELATÓRIO CLÍNICO", margin, 12)
  doc.setFontSize(7)
  doc.text(therapistName || "Profissional de Saúde", margin, 18)
  const typeLabel = getTypeInfo(report.type).label.toUpperCase()
  doc.text(typeLabel, pageW - margin, 12, { align: "right" })
  doc.text(formatDate(report.createdAt), pageW - margin, 18, { align: "right" })
  y = 38

  // Title
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  const titleLines = doc.splitTextToSize(report.title, contentW)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 7 + 2

  // Patient + meta line
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text(`Paciente: ${report.patientName}`, margin, y)
  y += 5
  doc.text(`Data: ${formatDateShort(report.createdAt)}  |  Status: ${getStatusInfo(report.status).label}`, margin, y)
  y += 8

  // Divider
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // Sections
  const sections = parseReportSections(report.content)
  if (sections.length > 0) {
    for (const section of sections) {
      checkPage(20)
      if (section.title) {
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(130, 10, 209)
        doc.text(section.title, margin, y)
        y += 6
      }
      if (section.text) {
        doc.setFontSize(9.5)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(50, 50, 50)
        const textLines = doc.splitTextToSize(section.text, contentW)
        for (const line of textLines) {
          checkPage(5)
          doc.text(line, margin, y)
          y += 4.5
        }
      }
      y += 6
    }
  } else if (report.content) {
    doc.setFontSize(9.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(50, 50, 50)
    const textLines = doc.splitTextToSize(report.content, contentW)
    for (const line of textLines) {
      checkPage(5)
      doc.text(line, margin, y)
      y += 4.5
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(160, 160, 160)
    doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 10, { align: "center" })
    doc.text("Documento gerado automaticamente — Evolua", pageW / 2, pageH - 6, { align: "center" })
  }

  return doc.output("blob")
}

/* ─── Upload PDF to Supabase Storage ─── */
async function uploadPdfToStorage(blob: Blob, reportId: string, patientId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const fileName = `${patientId}/${reportId}-${Date.now()}.pdf`
    const file = new File([blob], fileName, { type: "application/pdf" })

    const { data, error } = await supabase.storage
      .from("reports")
      .upload(fileName, file, { cacheControl: "3600", upsert: true, contentType: "application/pdf" })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from("reports")
      .getPublicUrl(data.path)

    return publicUrl
  } catch {
    return null
  }
}

/* ─── Message templates per report type ─── */
function buildReportMessage(
  report: Report,
  guardianName: string,
  patientName: string,
  pdfUrl?: string,
  nextAppointmentInfo?: { date: string; time: string; full: string },
): string {
  const typeLabel = getTypeInfo(report.type).label
  const date = formatDate(report.createdAt)
  const base = `Olá ${guardianName}! 😊\n\n`
  const pdfLine = pdfUrl ? `\n\n📎 *Acesse o relatório em PDF:*\n${pdfUrl}` : ""

  // Devolutiva block — only when next appointment info is provided
  const devolutivaBlock = nextAppointmentInfo
    ? `\n\n📅 *Devolutiva do Relatório*\n` +
      `Nosso próximo horário é *${nextAppointmentInfo.full}*.\n` +
      `Gostaria de aproveitar essa sessão para conversarmos sobre o relatório?\n\n` +
      `Responda:\n✅ *Sim* — para confirmar\n❌ *Não* — para reagendar`
    : `\n\nEstou à disposição para conversarmos! 💜`

  const messages: Record<string, string> = {
    evolution: base +
      `Segue o relatório de *Evolução* da sessão de *${patientName}* realizada em ${date}.\n\n` +
      `📋 *${report.title}*\n\n` +
      `Neste relatório você encontrará os objetivos trabalhados, atividades realizadas e a resposta do(a) ${patientName} durante a sessão.` +
      pdfLine +
      devolutivaBlock,
    evaluation: base +
      `Segue o relatório de *Avaliação Fonoaudiológica* de *${patientName}*.\n\n` +
      `📋 *${report.title}*\n\n` +
      `Este documento contém os resultados da avaliação, diagnóstico fonoaudiológico, prognóstico e o plano terapêutico proposto.` +
      pdfLine +
      devolutivaBlock,
    discharge: base +
      `Segue o relatório de *Alta* do tratamento fonoaudiológico de *${patientName}*.\n\n` +
      `📋 *${report.title}*\n\n` +
      `O documento contém o resumo do tratamento, objetivos alcançados e orientações para manutenção dos resultados.` +
      pdfLine +
      devolutivaBlock,
    monthly: base +
      `Segue o *Relatório Mensal* do tratamento de *${patientName}*.\n\n` +
      `📋 *${report.title}*\n\n` +
      `Neste relatório você encontrará o resumo das sessões do período, evolução observada e planejamento para o próximo mês.` +
      pdfLine +
      devolutivaBlock,
  }

  return messages[report.type] || (base +
    `Segue o relatório de *${typeLabel}* de *${patientName}* (${date}).\n\n` +
    `📋 *${report.title}*` +
    pdfLine +
    devolutivaBlock)
}

/* ─── Confirm Dialog ─── */
function ConfirmDialog({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string; confirmColor: string
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-full text-sm font-bold text-white transition-all shadow-lg ${confirmColor}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

/* ─── PDF Preview Component ─── */
function ReportPdfPreview({ report }: { report: Report }) {
  const sections = parseReportSections(report.content)
  const typeInfo = getTypeInfo(report.type)
  const statusInfo = getStatusInfo(report.status)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* PDF Header bar */}
      <div className="bg-[#820AD1] px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Relatório Clínico</p>
          <p className="text-[9px] text-white/60 mt-0.5">{typeInfo.label}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/60">{formatDate(report.createdAt)}</p>
        </div>
      </div>

      {/* PDF Body */}
      <div className="px-5 py-4 flex flex-col gap-3">
        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 leading-tight">{report.title}</h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span>Paciente: <span className="font-medium text-gray-700">{report.patientName}</span></span>
          <span className="text-gray-300">|</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.text}`}>
            <span className={`w-1 h-1 rounded-full ${statusInfo.dot}`} />
            {statusInfo.label}
          </span>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Sections */}
        {sections.length > 0 ? (
          <div className="flex flex-col gap-3">
            {sections.map((section, i) => (
              <div key={i}>
                {section.title && (
                  <p className="text-[11px] font-bold text-[#820AD1] uppercase tracking-wide mb-1">{section.title}</p>
                )}
                <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-4">{section.text || "—"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 italic">Sem conteúdo</p>
        )}
      </div>

      {/* PDF Footer */}
      <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[8px] text-gray-400 text-center">Documento gerado automaticamente — Evolua</p>
      </div>
    </div>
  )
}

/* ─── Format appointment date/time for display ─── */
function formatAppointmentDateTime(dateTime: string): { date: string; time: string; full: string } {
  const d = new Date(dateTime)
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" })
  return { date, time, full: `${weekday}, ${date} às ${time}` }
}

/* ─── Send Report Modal (with PDF preview + stepper UX) ─── */
function SendReportModal({ report, onClose, onSent }: { report: Report; onClose: () => void; onSent: () => void }) {
  const { patient, loading: patientLoading } = usePatient(report.patientId)
  const { createMessage, isSending } = useCreateMessage()
  const { user } = useUser()
  const { updateReport } = useReportMutations()

  // Fetch next upcoming appointment for this patient
  const { appointments: upcomingAppointments, loading: appointmentsLoading } = useAppointments({
    patientId: report.patientId,
    startDate: new Date().toISOString(),
    status: "scheduled",
    limit: 1,
  })
  const nextAppointment = upcomingAppointments[0] || null

  const [step, setStep] = useState<"preview" | "send">("preview")
  const [sent, setSent] = useState(false)
  const [messageEdited, setMessageEdited] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const pdfBlobRef = useRef<Blob | null>(null)

  const guardianName = patient?.guardianName || "Responsável"
  const guardianPhone = patient?.guardianPhone || ""
  const phoneResult = guardianPhone ? formatPhoneForWhatsApp(guardianPhone) : null
  const isPhoneValid = phoneResult?.valid ?? false

  const nextApptInfo = nextAppointment ? formatAppointmentDateTime(nextAppointment.dateTime) : undefined
  const defaultMessage = patient ? buildReportMessage(report, guardianName, patient.name, pdfUrl || undefined, nextApptInfo) : ""
  const [message, setMessage] = useState("")

  // Keep refs for latest values so callbacks always have current data
  const nextApptInfoRef = useRef(nextApptInfo)
  nextApptInfoRef.current = nextApptInfo
  const pdfUrlRef = useRef(pdfUrl)
  pdfUrlRef.current = pdfUrl

  if (patient && !messageEdited && message !== defaultMessage && defaultMessage) {
    setMessage(defaultMessage)
  }

  // Rebuild message when next appointment loads or pdfUrl changes (only if user hasn't manually edited)
  useEffect(() => {
    if (patient && !messageEdited) {
      const apptInfo = nextAppointment ? formatAppointmentDateTime(nextAppointment.dateTime) : undefined
      setMessage(buildReportMessage(report, guardianName, patient.name, pdfUrl || undefined, apptInfo))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextAppointment, pdfUrl])

  const therapistName = user?.user_metadata?.full_name || "Terapeuta"

  // Generate + upload PDF, then update message with link
  const handleGenerateAndUpload = useCallback(async () => {
    setGeneratingPdf(true)
    try {
      const blob = await generateReportPdf(report, therapistName)
      pdfBlobRef.current = blob

      setUploadingPdf(true)
      const url = await uploadPdfToStorage(blob, report.id, report.patientId)
      if (url) {
        setPdfUrl(url)
        // Message will be rebuilt by the useEffect watching pdfUrl
      }
      setUploadingPdf(false)
    } catch { /* */ }
    setGeneratingPdf(false)
  }, [report, therapistName])

  const handleDownloadPdf = useCallback(async () => {
    setGeneratingPdf(true)
    try {
      const blob = pdfBlobRef.current || await generateReportPdf(report, therapistName)
      pdfBlobRef.current = blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${report.title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").replace(/\s+/g, "-")}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { /* */ }
    setGeneratingPdf(false)
  }, [report, therapistName])

  // Auto-generate and upload PDF when moving to step 2
  const handleGoToSend = useCallback(async () => {
    setStep("send")
    if (!pdfUrl) {
      await handleGenerateAndUpload()
    }
  }, [pdfUrl, handleGenerateAndUpload])

  const handleSend = async () => {
    if (!phoneResult?.valid || !patient) return

    // Ensure PDF is generated and uploaded
    if (!pdfUrl) {
      setGeneratingPdf(true)
      setUploadingPdf(true)
      try {
        const blob = pdfBlobRef.current || await generateReportPdf(report, therapistName)
        pdfBlobRef.current = blob
        const uploadedUrl = await uploadPdfToStorage(blob, report.id, report.patientId)
        if (uploadedUrl) {
          setPdfUrl(uploadedUrl)
          // Inject PDF link into message if not already there
          if (!message.includes(uploadedUrl)) {
            setMessage(prev => prev + `\n\n📎 *Acesse o relatório em PDF:*\n${uploadedUrl}`)
          }
        }
      } catch { /* */ }
      setGeneratingPdf(false)
      setUploadingPdf(false)
    }

    // Build final message
    const finalMessage = pdfUrl && !message.includes(pdfUrl)
      ? message + `\n\n📎 *Acesse o relatório em PDF:*\n${pdfUrl}`
      : message

    const url = buildWhatsAppUrl(phoneResult.formatted, finalMessage)
    window.open(url, "_blank")

    // Log message
    try {
      await createMessage({
        patientId: report.patientId,
        content: finalMessage,
        templateType: "free",
        recipientPhone: phoneResult.formatted,
        recipientName: guardianName,
        channel: "whatsapp",
      })
    } catch { /* non-blocking */ }

    // Update report status
    try {
      await updateReport({ id: report.id, status: "sent" })
    } catch { /* non-blocking */ }

    setSent(true)
    setTimeout(() => { onSent(); onClose() }, 1500)
  }

  const typeInfo = getTypeInfo(report.type)
  const isBusy = isSending || generatingPdf || uploadingPdf

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#25D366] text-[22px]">send</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Enviar Relatório</h2>
              <p className="text-xs text-gray-500">Gere o PDF e envie via WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Step indicator */}
        {!sent && (
          <div className="px-5 sm:px-6 pt-4 flex items-center gap-3 shrink-0">
            <button onClick={() => setStep("preview")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${step === "preview" ? "bg-[#820AD1] text-white" : "bg-gray-100 text-gray-500"}`}>
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              Prévia do PDF
            </button>
            <div className="w-6 h-px bg-gray-200" />
            <button onClick={() => setStep("send")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${step === "send" ? "bg-[#820AD1] text-white" : "bg-gray-100 text-gray-500"}`}>
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              Mensagem e Envio
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
          {/* Success */}
          {sent && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
              </div>
              <p className="text-lg font-bold text-gray-900">Enviado com sucesso!</p>
              <p className="text-sm text-gray-500">O relatório foi enviado para o responsável via WhatsApp.</p>
            </div>
          )}

          {!sent && patientLoading && (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[#820AD1] text-2xl">progress_activity</span>
            </div>
          )}

          {/* Step 1: PDF Preview */}
          {!sent && !patientLoading && step === "preview" && (
            <>
              <ReportPdfPreview report={report} />

              {/* Download PDF button */}
              <button
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border-2 border-[#820AD1]/20 text-[#820AD1] font-bold text-sm hover:bg-[#820AD1]/5 transition-all disabled:opacity-50"
              >
                {generatingPdf ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>Gerando PDF...</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">download</span>Baixar PDF</>
                )}
              </button>
            </>
          )}

          {/* Step 2: Message + Send */}
          {!sent && !patientLoading && step === "send" && (
            <>
              {/* Report info compact */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className={`w-9 h-9 rounded-xl ${typeInfo.color === "text-[#820AD1]" ? "bg-[#820AD1]/10" : "bg-gray-100"} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${typeInfo.color} text-[18px]`}>{typeInfo.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{report.title}</p>
                  <p className="text-[11px] text-gray-500">{typeInfo.label} · {formatDate(report.createdAt)}</p>
                </div>
                {uploadingPdf ? (
                  <span className="material-symbols-outlined animate-spin text-[#820AD1] text-[18px]">progress_activity</span>
                ) : pdfUrl ? (
                  <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-gray-300 text-[18px]">picture_as_pdf</span>
                )}
              </div>

              {/* PDF status */}
              {(uploadingPdf || pdfUrl) && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${pdfUrl ? "bg-green-50 text-green-700" : "bg-purple-50 text-[#820AD1]"}`}>
                  {uploadingPdf ? (
                    <><span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>Gerando e enviando PDF para a nuvem...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[14px]">cloud_done</span>PDF gerado e hospedado — link incluído na mensagem</>
                  )}
                </div>
              )}

              {/* Recipient */}
              {guardianPhone ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#820AD1] text-[18px]">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{guardianName}</p>
                    <p className="text-xs text-gray-500">{guardianPhone}</p>
                  </div>
                  {isPhoneValid ? (
                    <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Válido</span>
                  ) : (
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Inválido</span>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">warning</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Telefone não cadastrado</p>
                    <p className="text-xs text-amber-700 mt-1">Cadastre o telefone do responsável para enviar via WhatsApp.</p>
                    <Link href={`/dashboard/pacientes/${report.patientId}/editar`} className="inline-flex items-center gap-1 text-xs font-bold text-[#820AD1] mt-2 hover:underline">
                      <span className="material-symbols-outlined text-[14px]">edit</span>Editar cadastro
                    </Link>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mensagem personalizada</label>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setMessageEdited(true) }}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all resize-y"
                />
                <p className="text-[11px] text-gray-400">Mensagem personalizada para &ldquo;{typeInfo.label}&rdquo;. O link do PDF está incluído na mensagem.</p>
              </div>

              {/* Next appointment info */}
              {!appointmentsLoading && nextAppointment && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="w-9 h-9 rounded-xl bg-[#820AD1]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[#820AD1] text-[18px]">event</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#820AD1] uppercase tracking-wide">Próxima sessão agendada</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{formatAppointmentDateTime(nextAppointment.dateTime).full}</p>
                    <p className="text-[11px] text-purple-600 mt-1">A mensagem inclui confirmação da devolutiva nesta sessão.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!sent && !patientLoading && (
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
            {step === "preview" ? (
              <>
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-sm flex items-center justify-center transition-all">
                  Cancelar
                </button>
                <button onClick={handleGoToSend}
                  className="flex-2 h-11 rounded-xl bg-[#820AD1] hover:bg-[#6D08AF] text-white font-bold text-sm shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all">
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  Continuar para Envio
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStep("preview")} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Voltar
                </button>
                <button
                  onClick={handleSend}
                  disabled={!isPhoneValid || !message.trim() || isBusy}
                  className="flex-2 h-11 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-sm shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBusy ? (
                    <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>{uploadingPdf ? "Preparando PDF..." : "Enviando..."}</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">send</span>Enviar com PDF via WhatsApp</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Report Detail Modal ─── */
function ReportDetailModal({ report, onClose, onSend }: { report: Report; onClose: () => void; onSend: () => void }) {
  const router = useRouter()
  const { deleteReport, submitForReview, approveReport, updateReport, isDeleting, isUpdating } = useReportMutations()
  const { user } = useUser()
  const [confirm, setConfirm] = useState<{ action: string; title: string; message: string; label: string; color: string } | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const statusInfo = getStatusInfo(report.status)
  const typeInfo = getTypeInfo(report.type)
  const sections = parseReportSections(report.content)
  const isBusy = isDeleting || isUpdating

  const handleAction = async () => {
    if (!confirm) return
    try {
      switch (confirm.action) {
        case "delete": await deleteReport(report.id); onClose(); break
        case "submit": await submitForReview(report.id); onClose(); break
        case "approve": await approveReport(report.id); onClose(); break
      }
    } catch { /* handled by query */ }
    setConfirm(null)
  }

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true)
    try {
      const therapistName = user?.user_metadata?.full_name || "Terapeuta"
      const blob = await generateReportPdf(report, therapistName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${report.title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").replace(/\s+/g, "-")}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { /* */ }
    setGeneratingPdf(false)
  }

  const actions: { icon: string; label: string; color: string; bg: string; onClick: () => void; show: boolean }[] = [
    {
      icon: "edit", label: "Editar", color: "text-[#820AD1]", bg: "hover:bg-purple-50", show: ["draft", "pending_review"].includes(report.status),
      onClick: () => router.push(`/dashboard/relatorios/novo?reportId=${report.id}`),
    },
    {
      icon: "picture_as_pdf", label: "Baixar PDF", color: "text-red-500", bg: "hover:bg-red-50", show: true,
      onClick: handleDownloadPdf,
    },
    {
      icon: "send", label: "Enviar para Revisão", color: "text-orange-600", bg: "hover:bg-orange-50", show: report.status === "draft",
      onClick: () => setConfirm({ action: "submit", title: "Enviar para Revisão?", message: "O relatório será enviado para revisão.", label: "Enviar", color: "bg-orange-500 hover:bg-orange-600" }),
    },
    {
      icon: "check_circle", label: "Aprovar", color: "text-green-600", bg: "hover:bg-green-50", show: report.status === "pending_review",
      onClick: () => setConfirm({ action: "approve", title: "Aprovar Relatório?", message: "O relatório será aprovado e poderá ser enviado ao responsável.", label: "Aprovar", color: "bg-green-500 hover:bg-green-600" }),
    },
    {
      icon: "forward_to_inbox", label: "Enviar ao Responsável", color: "text-[#25D366]", bg: "hover:bg-green-50", show: ["approved", "pending_review", "reviewed"].includes(report.status),
      onClick: () => { onClose(); setTimeout(() => onSend(), 100) },
    },
    {
      icon: "delete", label: "Excluir", color: "text-red-500", bg: "hover:bg-red-50", show: ["draft", "archived"].includes(report.status),
      onClick: () => setConfirm({ action: "delete", title: "Excluir Relatório?", message: "Esta ação não pode ser desfeita.", label: "Excluir", color: "bg-red-500 hover:bg-red-600" }),
    },
  ]

  const visibleActions = actions.filter(a => a.show)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl ${typeInfo.color === "text-[#820AD1]" ? "bg-[#820AD1]/10" : "bg-gray-100"} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${typeInfo.color} text-[22px]`}>{typeInfo.icon}</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{report.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{typeInfo.label} · {formatDate(report.createdAt)}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-4">
            {/* Status + Patient */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
              <span className="text-xs text-gray-400">Paciente: <span className="font-medium text-gray-600">{report.patientName}</span></span>
            </div>

            {/* Content sections */}
            {sections.length > 0 ? (
              <div className="flex flex-col gap-3">
                {sections.map((section, i) => (
                  <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    {section.title && (
                      <p className="text-[11px] font-bold text-[#820AD1] uppercase tracking-wide mb-2">{section.title}</p>
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{section.text || <span className="text-gray-400 italic">Sem conteúdo</span>}</p>
                  </div>
                ))}
              </div>
            ) : report.content ? (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Conteúdo</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{report.content}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-sm text-gray-400 italic">Sem conteúdo</p>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Criado em</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateShort(report.createdAt)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Atualizado em</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateShort(report.updatedAt)}</p>
              </div>
              {report.sentAt && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Enviado em</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateShort(report.sentAt)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {visibleActions.length > 0 && (
              <div className="flex flex-col gap-1 pt-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Ações</p>
                {visibleActions.map((a) => (
                  <button key={a.label} onClick={a.onClick} disabled={isBusy || (a.icon === "picture_as_pdf" && generatingPdf)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl ${a.bg} transition-colors text-left disabled:opacity-50`}>
                    <span className={`material-symbols-outlined ${a.color} text-[20px]`}>
                      {a.icon === "picture_as_pdf" && generatingPdf ? "progress_activity" : a.icon}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {a.icon === "picture_as_pdf" && generatingPdf ? "Gerando PDF..." : a.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        confirmLabel={confirm?.label || ""}
        confirmColor={confirm?.color || ""}
        onConfirm={handleAction}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

/* ─── Main Page ─── */
export default function RelatoriosPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(1)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [sendReport, setSendReport] = useState<Report | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null)

  const { deleteReport, isDeleting } = useReportMutations()

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { reports, total, loading, refetch } = useReports({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  })

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await deleteReport(deleteTarget.id) } catch { /* */ }
    setDeleteTarget(null)
  }

  const handleSent = () => {
    refetch()
    setSendReport(null)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie todos os relatórios clínicos</p>
          </div>
          <Link href="/dashboard/relatorios/novo"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#820AD1] hover:bg-[#6D08AF] text-white font-bold text-sm shadow-lg shadow-purple-200 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Relatório
          </Link>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Buscar por título ou paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_TABS.map((tab) => (
              <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  statusFilter === tab.key
                    ? "bg-[#820AD1] text-white shadow-lg shadow-purple-200"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#820AD1]/30 hover:text-[#820AD1]"
                }`}>
                {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === tab.key ? "bg-white" : tab.dot}`} />}
                {tab.icon && <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {TYPE_TABS.map((tab) => (
              <button key={tab.key} onClick={() => { setTypeFilter(tab.key); setPage(1) }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  typeFilter === tab.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400">{total} relatório{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>

        {/* Report list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-[#820AD1] text-3xl">progress_activity</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-300 text-4xl">description</span>
            </div>
            <p className="text-sm font-bold text-gray-400">Nenhum relatório encontrado</p>
            <p className="text-xs text-gray-400">Tente ajustar os filtros ou crie um novo relatório</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((report) => {
              const si = getStatusInfo(report.status)
              const ti = getTypeInfo(report.type)
              return (
                <div key={report.id}
                  className="glass-card rounded-xl p-4 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedReport(report)}>
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${ti.color === "text-[#820AD1]" ? "bg-[#820AD1]/10" : "bg-gray-100"} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${ti.color} text-[20px] sm:text-[22px]`}>{ti.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{report.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 truncate">{report.patientName}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${si.bg} ${si.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                      {si.label}
                    </span>
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-medium">{ti.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {["draft", "pending_review"].includes(report.status) && (
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/relatorios/novo?reportId=${report.id}`) }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#820AD1] transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    )}
                    {["approved", "pending_review", "reviewed"].includes(report.status) && (
                      <button onClick={(e) => { e.stopPropagation(); setSendReport(report) }}
                        className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-[#25D366] transition-colors" title="Enviar ao Responsável">
                        <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                      </button>
                    )}
                    {["draft", "archived"].includes(report.status) && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(report) }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                  <div className="sm:hidden shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${si.dot} block`} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) { pageNum = i + 1 }
              else if (page <= 3) { pageNum = i + 1 }
              else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i }
              else { pageNum = page - 2 + i }
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    page === pageNum ? "bg-[#820AD1] text-white shadow-lg shadow-purple-200" : "text-gray-500 hover:bg-gray-100"
                  }`}>
                  {pageNum}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => { setSelectedReport(null); refetch() }}
          onSend={() => setSendReport(selectedReport)}
        />
      )}

      {sendReport && (
        <SendReportModal report={sendReport} onClose={() => setSendReport(null)} onSent={handleSent} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Relatório?"
        message="Esta ação não pode ser desfeita. O relatório será removido permanentemente."
        confirmLabel={isDeleting ? "Excluindo..." : "Excluir"}
        confirmColor="bg-red-500 hover:bg-red-600"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
