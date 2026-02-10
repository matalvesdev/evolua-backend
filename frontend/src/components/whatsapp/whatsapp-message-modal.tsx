"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  formatPhoneForWhatsApp,
  buildWhatsAppUrl,
  applyTemplate,
  type MessageTemplateType,
  type TemplateContext,
} from "@/lib/utils/whatsapp-utils"
import { useCreateMessage } from "@/hooks/use-messages"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhatsAppMessageModalProps {
  open: boolean
  onClose: () => void
  patient: {
    id: string
    name: string
    guardianName?: string
    guardianPhone?: string
    guardianRelationship?: string
  }
  nextAppointment?: {
    dateTime: string
    type?: string
    duration?: number
  } | null
  defaultTemplate?: MessageTemplateType
}

// ---------------------------------------------------------------------------
// Template selector button labels & icons
// ---------------------------------------------------------------------------

const TEMPLATE_OPTIONS: { type: MessageTemplateType; label: string; icon: string }[] = [
  { type: "reminder", label: "Lembrete", icon: "calendar_clock" },
  { type: "activity", label: "Atividade", icon: "assignment" },
  { type: "feedback", label: "Feedback", icon: "rate_review" },
  { type: "free", label: "Livre", icon: "edit_note" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WhatsAppMessageModal({
  open,
  onClose,
  patient,
  nextAppointment,
  defaultTemplate = "free",
}: WhatsAppMessageModalProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<MessageTemplateType>(defaultTemplate)
  const [message, setMessage] = useState("")
  const { createMessage, isSending } = useCreateMessage()

  // ---- Derived state ----
  const hasGuardianPhone = Boolean(patient.guardianPhone)
  const phoneResult = hasGuardianPhone
    ? formatPhoneForWhatsApp(patient.guardianPhone!)
    : null
  const isPhoneValid = phoneResult?.valid ?? false

  const showNoAppointmentWarning =
    selectedTemplate === "reminder" && !nextAppointment

  // ---- Build template context ----
  const buildContext = (): TemplateContext => {
    const ctx: TemplateContext = {
      patientName: patient.name,
      guardianName: patient.guardianName || "Responsável",
      clinicName: "Clínica",
    }
    if (nextAppointment) {
      const dt = new Date(nextAppointment.dateTime)
      ctx.appointmentDate = dt.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      ctx.appointmentTime = dt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }
    return ctx
  }

  // ---- Sync template → message text ----
  useEffect(() => {
    setSelectedTemplate(defaultTemplate)
  }, [defaultTemplate])

  useEffect(() => {
    const ctx = buildContext()
    setMessage(applyTemplate(selectedTemplate, ctx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, patient.name, patient.guardianName, nextAppointment])

  // ---- Handlers ----
  const handleTemplateSelect = (type: MessageTemplateType) => {
    setSelectedTemplate(type)
  }

  const handleSend = async () => {
    if (!isPhoneValid || !phoneResult) return

    // 1. Build wa.me URL and open in new tab
    const url = buildWhatsAppUrl(phoneResult.formatted, message)
    window.open(url, "_blank")

    // 2. Register message in backend
    try {
      await createMessage({
        patientId: patient.id,
        content: message,
        templateType: selectedTemplate,
        recipientPhone: phoneResult.formatted,
        recipientName: patient.guardianName || "Responsável",
        channel: "whatsapp",
      })
    } catch {
      // The wa.me link was already opened — we still close the modal.
      // A toast could be shown here in the future.
    }

    // 3. Close modal
    onClose()
  }

  // ---- Render ----
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
        {/* ---- Header ---- */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-gray-900">
            <span className="bg-green-100 text-green-600 p-2 rounded-xl">
              <span className="material-symbols-outlined text-[22px]">
                chat
              </span>
            </span>
            Enviar Mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* ---- Recipient info ---- */}
          {hasGuardianPhone ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="bg-purple-50 text-[#820AD1] p-2 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">
                  person
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {patient.guardianName || "Responsável"}
                  {patient.guardianRelationship && (
                    <span className="text-gray-500 font-medium">
                      {" "}
                      ({patient.guardianRelationship})
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {patient.guardianPhone}
                </p>
              </div>
              {isPhoneValid && (
                <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  Válido
                </span>
              )}
              {!isPhoneValid && phoneResult && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  Inválido
                </span>
              )}
            </div>
          ) : (
            /* ---- Warning: no guardian phone ---- */
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="material-symbols-outlined text-amber-600 text-[22px] mt-0.5">
                warning
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">
                  Telefone do responsável não cadastrado
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Para enviar mensagens via WhatsApp, cadastre o telefone do
                  responsável.
                </p>
                <Link
                  href={`/dashboard/pacientes/${patient.id}/editar`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#820AD1] mt-2 hover:underline"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    edit
                  </span>
                  Editar cadastro do paciente
                </Link>
              </div>
            </div>
          )}

          {/* ---- Template selector ---- */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Tipo de Mensagem
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TEMPLATE_OPTIONS.map((opt) => {
                const isSelected = selectedTemplate === opt.type
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleTemplateSelect(opt.type)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? "border-[#820AD1] bg-[#820AD1]/5 text-[#820AD1]"
                        : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] ${
                        isSelected ? "text-[#820AD1]" : "text-gray-400"
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ---- Warning: reminder without appointment ---- */}
          {showNoAppointmentWarning && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="material-symbols-outlined text-amber-600 text-[22px] mt-0.5">
                event_busy
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">
                  Nenhuma sessão agendada
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Para enviar um lembrete, agende uma sessão primeiro.
                </p>
                <Link
                  href={`/dashboard/agendamentos/novo?patientId=${patient.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#820AD1] mt-2 hover:underline"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    add
                  </span>
                  Agendar sessão
                </Link>
              </div>
            </div>
          )}

          {/* ---- Message textarea ---- */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Mensagem
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[160px] rounded-xl border-gray-200 focus-visible:border-[#820AD1] focus-visible:ring-[#820AD1]/20 text-sm resize-none"
            />
          </div>

          {/* ---- Send button ---- */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={!isPhoneValid || !message.trim() || isSending}
            className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold text-sm shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                Enviando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
                Enviar via WhatsApp
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type { WhatsAppMessageModalProps }
