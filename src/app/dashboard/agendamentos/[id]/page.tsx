"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppointment, useAppointmentMutations, useReportMutations } from "@/hooks"
import { usePatient } from "@/hooks"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>
}

const TYPE_LABELS: Record<string, string> = {
  regular: "Sessão Regular",
  evaluation: "Avaliação",
  reevaluation: "Reavaliação",
  discharge: "Alta",
  session: "Sessão",
  follow_up: "Acompanhamento",
  parent_meeting: "Reunião com Pais",
  report_delivery: "Entrega de Relatório",
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  scheduled: { label: "Agendado", bg: "bg-[#820AD1]/10", text: "text-[#820AD1]", icon: "schedule" },
  confirmed: { label: "Confirmado", bg: "bg-green-100", text: "text-green-700", icon: "check_circle" },
  "in-progress": { label: "Em Andamento", bg: "bg-blue-100", text: "text-blue-700", icon: "play_circle" },
  in_progress: { label: "Em Andamento", bg: "bg-blue-100", text: "text-blue-700", icon: "play_circle" },
  completed: { label: "Concluído", bg: "bg-green-100", text: "text-green-700", icon: "task_alt" },
  cancelled: { label: "Cancelado", bg: "bg-red-100", text: "text-red-700", icon: "cancel" },
  "no-show": { label: "Não Compareceu", bg: "bg-orange-100", text: "text-orange-700", icon: "person_off" },
  no_show: { label: "Não Compareceu", bg: "bg-orange-100", text: "text-orange-700", icon: "person_off" },
}

export default function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { appointment, loading, error } = useAppointment(id)
  const { patient } = usePatient(appointment?.patientId ?? "")
  const { confirmAppointment, startAppointment, cancelAppointment, completeAppointment, deleteAppointment } = useAppointmentMutations()
  const { createReport } = useReportMutations()
  const [sessionNotes, setSessionNotes] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [reportContent, setReportContent] = useState("")
  const [savingReport, setSavingReport] = useState(false)
  const [reportSaved, setReportSaved] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-[#820AD1] text-3xl">progress_activity</span>
          <p className="text-gray-500 mt-3 text-sm">Carregando agendamento...</p>
        </div>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 text-center max-w-md rounded-2xl">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">event_busy</span>
          <p className="text-red-600 mb-4">Agendamento não encontrado</p>
          <Link href="/dashboard/agendamentos">
            <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-bold py-2.5 px-5 rounded-full transition-all">
              Voltar para agenda
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const dt = new Date(appointment.dateTime)
  const status = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled
  const typeLabel = TYPE_LABELS[appointment.type] || appointment.type
  const canConfirm = appointment.status === "scheduled"
  const canStart = appointment.status === "confirmed" || appointment.status === "scheduled"
  const canComplete = appointment.status === "in-progress" || appointment.status === "in_progress"
  const canCancel = appointment.status !== "completed" && appointment.status !== "cancelled"
  const isFinished = appointment.status === "completed" || appointment.status === "cancelled"
  const isCompleted = appointment.status === "completed"

  const handleConfirm = async () => {
    await confirmAppointment(id)
  }

  const handleStart = async () => {
    await startAppointment(id)
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelAppointment({ id, reason: "patient-request", cancelledBy: "therapist" })
    } finally {
      setCancelling(false)
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await completeAppointment({ id, sessionNotes: sessionNotes || undefined })
    } finally {
      setCompleting(false)
    }
  }

  const handleDelete = async () => {
    await deleteAppointment(id)
    router.push("/dashboard/agendamentos")
  }

  const handleSaveReport = async () => {
    if (!reportContent.trim()) return
    setSavingReport(true)
    try {
      await createReport({
        patientId: appointment.patientId,
        type: "evolution",
        title: `Sessão ${appointment.patientName || "Paciente"} - ${dt.toLocaleDateString("pt-BR")}`,
        content: reportContent,
        appointmentId: id,
      })
      setReportSaved(true)
    } catch (err) {
      console.error("Erro ao salvar relatório:", err)
    } finally {
      setSavingReport(false)
    }
  }

  const age = patient?.birthDate
    ? Math.floor((new Date().getTime() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
    <div className="flex flex-col gap-6 sm:gap-8 max-w-5xl mx-auto px-3 sm:px-4 md:px-8 py-6 sm:py-8 pb-24">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 font-medium overflow-x-auto">
        <Link href="/dashboard" className="hover:text-[#820AD1] transition-colors whitespace-nowrap">Dashboard</Link>
        <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-gray-400">chevron_right</span>
        <Link href="/dashboard/agendamentos" className="hover:text-[#820AD1] transition-colors whitespace-nowrap">Agendamentos</Link>
        <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-gray-400">chevron_right</span>
        <span className="text-gray-900 whitespace-nowrap">Detalhes</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Detalhes do Agendamento</h1>
              <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 ${status.bg} ${status.text} text-[10px] sm:text-xs font-bold rounded-full flex items-center gap-1 shrink-0`}>
                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">{status.icon}</span>
                {status.label}
              </span>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm">
              {dt.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 shrink-0">
            <Link href="/dashboard/agendamentos">
              <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-xs sm:text-sm font-bold py-2 sm:py-2.5 px-3 sm:px-5 rounded-full transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span>Voltar
              </button>
            </Link>
            {canConfirm && (
              <button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold py-2 sm:py-2.5 px-3 sm:px-5 rounded-full transition-all shadow-lg shadow-green-200 flex items-center gap-1.5 sm:gap-2">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">check_circle</span>Confirmar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6">
          {/* Date & Time Card */}
          <section className="glass-card-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#820AD1]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start relative z-10">
              {/* Date block */}
              <div className="flex flex-row sm:flex-col items-center justify-center bg-[#820AD1]/5 rounded-xl sm:rounded-2xl p-3 sm:p-6 sm:min-w-[140px] gap-3 sm:gap-0 w-full sm:w-auto">
                <span className="text-3xl sm:text-5xl font-bold text-[#820AD1] tracking-tight">{dt.getDate()}</span>
                <div className="flex sm:flex-col items-center gap-1.5 sm:gap-0">
                  <span className="text-xs sm:text-sm font-bold text-[#820AD1]/70 uppercase sm:mt-1">
                    {dt.toLocaleDateString("pt-BR", { month: "short" })}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium sm:mt-1">
                    {dt.toLocaleDateString("pt-BR", { weekday: "long" })}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="flex-1 grid grid-cols-2 gap-4 sm:gap-6 w-full">
                <DetailItem icon="schedule" iconBg="bg-blue-50" iconColor="text-blue-600" label="Horário" value={dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} />
                <DetailItem icon="timer" iconBg="bg-purple-50" iconColor="text-[#820AD1]" label="Duração" value={`${appointment.duration} min`} />
                <DetailItem icon="medical_services" iconBg="bg-orange-50" iconColor="text-orange-600" label="Tipo" value={typeLabel} />
                <DetailItem icon="location_on" iconBg="bg-pink-50" iconColor="text-pink-600" label="Local" value="Presencial" />
              </div>
            </div>
          </section>

          {/* Patient Card */}
          <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="bg-purple-100 p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-[#820AD1] shadow-sm shadow-purple-100">
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">person</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Paciente</h3>
                <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Informações do paciente</p>
              </div>
            </div>

            {patient ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 sm:gap-5">
                  <div className="shrink-0">
                    <div className="rounded-xl sm:rounded-2xl size-14 sm:size-20 shadow-md border-[3px] sm:border-4 border-white flex items-center justify-center" style={{ background: "linear-gradient(135deg, #820AD1 0%, #C084FC 100%)" }}>
                      <span className="text-white text-lg sm:text-2xl font-bold">{patient.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 min-w-0">
                    <div>
                      <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">Nome</span>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 wrap-break-word">{patient.name}</span>
                    </div>
                    {age !== null && (
                      <div>
                        <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">Idade</span>
                        <span className="text-xs sm:text-sm font-bold text-gray-900">{age} anos</span>
                      </div>
                    )}
                    {patient.phone && (
                      <div>
                        <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">Telefone</span>
                        <span className="text-xs sm:text-sm font-bold text-gray-900">{patient.phone}</span>
                      </div>
                    )}
                    {patient.guardianName && (
                      <div>
                        <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">Responsável</span>
                        <span className="text-xs sm:text-sm font-bold text-gray-900 wrap-break-word">
                          {patient.guardianName}
                          {patient.guardianRelationship && ` (${patient.guardianRelationship})`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Link href={`/dashboard/pacientes/${patient.id}`} className="self-start">
                  <button className="bg-white border border-gray-200 hover:bg-[#820AD1]/5 hover:border-[#820AD1]/20 hover:text-[#820AD1] text-gray-600 text-xs sm:text-sm font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 sm:gap-2">
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">open_in_new</span>
                    Ver Perfil
                  </button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="rounded-lg sm:rounded-xl size-10 sm:size-14 bg-gray-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-gray-400 text-[20px] sm:text-[24px]">person</span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-gray-900 block truncate">{appointment.patientName || "Paciente"}</span>
                  <p className="text-[10px] sm:text-xs text-gray-500">Carregando dados do paciente...</p>
                </div>
              </div>
            )}
          </section>

          {/* Notes Section */}
          {(appointment.sessionNotes || appointment.notes || canComplete) && (
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="bg-amber-100 p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-amber-600 shadow-sm shadow-amber-100">
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">edit_note</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Anotações</h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Observações da sessão</p>
                </div>
              </div>

              {appointment.notes && (
                <div>
                  <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 sm:mb-2">Notas do Agendamento</span>
                  <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100 leading-relaxed">{appointment.notes}</p>
                </div>
              )}

              {appointment.sessionNotes && (
                <div>
                  <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 sm:mb-2">Notas da Sessão</span>
                  <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100 leading-relaxed">{appointment.sessionNotes}</p>
                </div>
              )}

              {canComplete && (
                <div>
                  <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 sm:mb-2">Notas da Sessão</span>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Descreva o que foi trabalhado nesta sessão..."
                    className="w-full min-h-[100px] sm:min-h-[120px] bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/30 transition-all placeholder:text-gray-400 text-gray-900 resize-none"
                  />
                </div>
              )}
            </section>
          )}

          {/* Report Section — after session completed */}
          {isCompleted && !reportSaved && (
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 border-l-4 border-l-[#820AD1]">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="bg-[#820AD1]/10 p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-[#820AD1] shadow-sm shadow-purple-100">
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">description</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Relatório da Sessão</h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Registre a evolução do paciente</p>
                </div>
              </div>

              <div>
                <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 sm:mb-2">Conteúdo do Relatório</span>
                <textarea
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="Descreva a evolução do paciente, atividades realizadas, observações clínicas..."
                  className="w-full min-h-[140px] sm:min-h-[180px] bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/30 transition-all placeholder:text-gray-400 text-gray-900 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleSaveReport}
                  disabled={savingReport || !reportContent.trim()}
                  className="flex-1 bg-[#820AD1] hover:bg-[#6D08AF] disabled:bg-gray-300 text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">{savingReport ? "progress_activity" : "save"}</span>
                  {savingReport ? "Salvando..." : "Salvar Relatório"}
                </button>
                <Link href={`/dashboard/pacientes/${appointment.patientId}/novo-relatorio`}>
                  <button className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-[#820AD1]/5 hover:border-[#820AD1]/20 hover:text-[#820AD1] text-gray-600 text-xs sm:text-sm font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                    Gravar com Áudio
                  </button>
                </Link>
              </div>
            </section>
          )}

          {/* Report Saved Confirmation */}
          {isCompleted && reportSaved && (
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 flex items-center gap-3 sm:gap-4 border-l-4 border-l-green-500">
              <div className="bg-green-100 p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-green-600 shrink-0">
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">task_alt</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Relatório salvo com sucesso</h3>
                <p className="text-[10px] sm:text-xs text-gray-600 font-medium">O relatório de evolução foi criado e está disponível para revisão</p>
              </div>
              <Link href={`/dashboard/pacientes/${appointment.patientId}`}>
                <button className="bg-white border border-gray-200 hover:bg-green-50 text-gray-600 text-xs sm:text-sm font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 shrink-0">
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span className="hidden sm:inline">Ver Paciente</span>
                </button>
              </Link>
            </section>
          )}

          {/* Cancellation Info */}
          {appointment.status === "cancelled" && (
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border-l-4 border-l-red-400">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-red-100 p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-red-600">
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">cancel</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Cancelamento</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {appointment.cancellationReason && (
                  <div>
                    <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">Motivo</span>
                    <span className="text-xs sm:text-sm font-bold text-gray-900">{appointment.cancellationReason}</span>
                  </div>
                )}
                {appointment.cancelledBy && (
                  <div>
                    <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">Cancelado por</span>
                    <span className="text-xs sm:text-sm font-bold text-gray-900">{appointment.cancelledBy === "therapist" ? "Terapeuta" : appointment.cancelledBy === "patient" ? "Paciente" : "Sistema"}</span>
                  </div>
                )}
                {appointment.cancellationNotes && (
                  <div className="sm:col-span-2">
                    <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">Observações</span>
                    <p className="text-xs sm:text-sm text-gray-700 mt-1">{appointment.cancellationNotes}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column — Actions */}
        <div className="lg:col-span-4 flex flex-col gap-5 sm:gap-6">
          {/* Quick Actions */}
          {!isFinished && (
            <div className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-5">
                <span className="material-symbols-outlined text-[#820AD1] text-[20px] sm:text-[22px]">bolt</span>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Ações Rápidas</h3>
              </div>
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {canConfirm && (
                  <button onClick={handleConfirm} className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-gray-100 hover:border-green-300 hover:shadow-md transition-all text-left group">
                    <div className="bg-green-50 text-green-600 p-2 sm:p-2.5 rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">check_circle</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">Confirmar Agendamento</span>
                      <span className="block text-[10px] sm:text-xs text-gray-600 font-medium">Marcar como confirmado</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-green-600 transition-all text-[18px] sm:text-[24px] shrink-0">chevron_right</span>
                  </button>
                )}

                {canStart && (
                  <button onClick={handleStart} className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-gray-100 hover:border-[#820AD1]/30 hover:shadow-md transition-all text-left group">
                    <div className="bg-[#820AD1]/10 text-[#820AD1] p-2 sm:p-2.5 rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">play_circle</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#820AD1] transition-colors">Iniciar Sessão</span>
                      <span className="block text-[10px] sm:text-xs text-gray-600 font-medium">Começar atendimento</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-[#820AD1] transition-all text-[18px] sm:text-[24px] shrink-0">chevron_right</span>
                  </button>
                )}

                {canComplete && (
                  <button onClick={handleComplete} disabled={completing} className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                    <div className="bg-blue-50 text-blue-600 p-2 sm:p-2.5 rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">task_alt</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {completing ? "Concluindo..." : "Concluir Sessão"}
                      </span>
                      <span className="block text-[10px] sm:text-xs text-gray-600 font-medium">Finalizar atendimento</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-600 transition-all text-[18px] sm:text-[24px] shrink-0">chevron_right</span>
                  </button>
                )}

                {canCancel && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button disabled={cancelling} className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-gray-100 hover:border-red-300 hover:shadow-md transition-all text-left group">
                        <div className="bg-red-50 text-red-500 p-2 sm:p-2.5 rounded-lg shrink-0">
                          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">cancel</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs sm:text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">Cancelar Agendamento</span>
                          <span className="block text-[10px] sm:text-xs text-gray-600 font-medium">Cancelar esta consulta</span>
                        </div>
                        <span className="material-symbols-outlined text-gray-300 group-hover:text-red-500 transition-all text-[18px] sm:text-[24px] shrink-0">chevron_right</span>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">Cancelar Agendamento</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}

          {/* Post-completion Actions */}
          {isCompleted && (
            <div className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-5">
                <span className="material-symbols-outlined text-[#820AD1] text-[20px] sm:text-[22px]">bolt</span>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Ações Rápidas</h3>
              </div>
              <div className="flex flex-col gap-2.5 sm:gap-3">
                <Link href={`/dashboard/pacientes/${appointment.patientId}/novo-relatorio`}>
                  <button className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-gray-100 hover:border-[#820AD1]/30 hover:shadow-md transition-all text-left group">
                    <div className="bg-[#820AD1]/10 text-[#820AD1] p-2 sm:p-2.5 rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">mic</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#820AD1] transition-colors">Gravar Relatório</span>
                      <span className="block text-[10px] sm:text-xs text-gray-600 font-medium">Ditar relatório por áudio</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-[#820AD1] transition-all text-[18px] sm:text-[24px] shrink-0">chevron_right</span>
                  </button>
                </Link>
                <Link href={`/dashboard/pacientes/${appointment.patientId}`}>
                  <button className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-gray-100 hover:border-green-300 hover:shadow-md transition-all text-left group">
                    <div className="bg-green-50 text-green-600 p-2 sm:p-2.5 rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">Ver Paciente</span>
                      <span className="block text-[10px] sm:text-xs text-gray-600 font-medium">Acessar perfil completo</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-green-600 transition-all text-[18px] sm:text-[24px] shrink-0">chevron_right</span>
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Timeline Card */}
          <div className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-5">
              <span className="material-symbols-outlined text-gray-500 text-[20px] sm:text-[22px]">timeline</span>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Histórico</h3>
            </div>
            <div className="relative pl-4 space-y-4 sm:space-y-5 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
              <TimelineEntry icon="add_circle" color="text-[#820AD1]" dotColor="bg-[#820AD1]" label="Agendamento criado" time={new Date(appointment.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} />
              {appointment.confirmedAt && (
                <TimelineEntry icon="check_circle" color="text-green-600" dotColor="bg-green-500" label="Confirmado" time={new Date(appointment.confirmedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} />
              )}
              {appointment.startedAt && (
                <TimelineEntry icon="play_circle" color="text-blue-600" dotColor="bg-blue-500" label="Sessão iniciada" time={new Date(appointment.startedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} />
              )}
              {appointment.completedAt && (
                <TimelineEntry icon="task_alt" color="text-green-600" dotColor="bg-green-500" label="Sessão concluída" time={new Date(appointment.completedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} />
              )}
              {appointment.cancelledAt && (
                <TimelineEntry icon="cancel" color="text-red-600" dotColor="bg-red-500" label="Cancelado" time={new Date(appointment.cancelledAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} />
              )}
            </div>
          </div>

          {/* Danger Zone */}
          {isFinished && (
            <div className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
                <span className="material-symbols-outlined text-gray-500 text-[20px] sm:text-[22px]">settings</span>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Ações</h3>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white border border-gray-100 hover:border-red-300 hover:shadow-md transition-all text-left group">
                    <div className="bg-red-50 text-red-500 p-2 sm:p-2.5 rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">delete</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">Excluir Agendamento</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Agendamento</AlertDialogTitle>
                    <AlertDialogDescription>Tem certeza que deseja excluir este agendamento permanentemente?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}

function DetailItem({ icon, iconBg, iconColor, label, value }: { icon: string; iconBg: string; iconColor: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={`${iconBg} p-1.5 sm:p-2 rounded-lg ${iconColor} shrink-0`}>
        <span className="material-symbols-outlined text-[16px] sm:text-[20px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <span className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-xs sm:text-sm font-bold text-gray-900 wrap-break-word">{value}</span>
      </div>
    </div>
  )
}

function TimelineEntry({ icon, color, dotColor, label, time }: { icon: string; color: string; dotColor: string; label: string; time: string }) {
  return (
    <div className="relative flex gap-2.5 sm:gap-3 pl-3">
      <div className={`absolute left-0 top-1.5 size-3 sm:size-3.5 ${dotColor} rounded-full border-2 sm:border-[3px] border-white shadow-sm z-10 box-content`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`material-symbols-outlined text-[14px] sm:text-[16px] ${color}`}>{icon}</span>
          <span className="text-xs sm:text-sm font-bold text-gray-900">{label}</span>
        </div>
        <span className="text-[10px] sm:text-xs text-gray-500 font-medium">{time}</span>
      </div>
    </div>
  )
}
