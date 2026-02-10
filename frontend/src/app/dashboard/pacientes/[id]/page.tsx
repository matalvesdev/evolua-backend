"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { usePatient, usePatientMutations, usePatientReports, useAppointments } from "@/hooks"
import { Button } from "@/components/ui/button"
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
import {
  formatReportType,
  formatReportDate,
} from "@/components/patient-profile/patient-profile-utils"
import { WhatsAppMessageModal } from "@/components/whatsapp/whatsapp-message-modal"
import type { MessageTemplateType } from "@/lib/utils/whatsapp-utils"

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string
  const { patient, loading, error, refetch } = usePatient(patientId)
  const { reports, loading: reportsLoading } = usePatientReports(patientId)
  const { appointments } = useAppointments({ patientId })
  const { remove, discharge, reactivate, loading: mutationLoading } = usePatientMutations()
  const [docSearch, setDocSearch] = React.useState("")
  const [whatsappOpen, setWhatsappOpen] = React.useState(false)
  const [whatsappTemplate, setWhatsappTemplate] = React.useState<MessageTemplateType>('free')

  const handleDelete = async () => {
    const result = await remove(patientId)
    if (result.success) router.push("/dashboard/pacientes")
  }
  const handleDischarge = async () => {
    const result = await discharge(patientId, "Alta médica")
    if (result.success) refetch()
  }
  const handleReactivate = async () => {
    const result = await reactivate(patientId)
    if (result.success) refetch()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-[#820AD1] text-3xl">progress_activity</span>
          <p className="text-gray-500 mt-3 text-sm">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">person_off</span>
          <p className="text-red-600 mb-4">{error?.message || "Paciente não encontrado"}</p>
          <Link href="/dashboard/pacientes"><Button variant="outline">Voltar para lista</Button></Link>
        </div>
      </div>
    )
  }

  const age = patient.birthDate
    ? Math.floor((new Date().getTime() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const birthFmt = patient.birthDate
    ? new Date(patient.birthDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null
  const now = new Date()
  const upcoming = appointments
    .filter((a) => new Date(a.dateTime) > now && a.status !== "cancelled" && a.status !== "completed")
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  const nextApt = upcoming[0]
  const completed = appointments
    .filter((a) => a.status === "completed")
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
  const lastSession = completed[0]

  const sbMap: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    active: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "Em Tratamento" },
    inactive: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", label: "Inativo" },
    discharged: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Alta" },
    "on-hold": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", label: "Em Espera" },
  }
  const sb = sbMap[patient.status] || sbMap.active

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
    <div className="flex flex-col gap-8 max-w-7xl mx-auto px-4 md:px-8 py-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <nav className="flex items-center gap-2 text-sm text-gray-600 font-medium mb-1">
            <Link href="/dashboard/pacientes" className="hover:text-[#820AD1] transition-colors">Pacientes</Link>
            <span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span>
            <span className="text-gray-900">Perfil</span>
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">{patient.name}</h1>
            <span className={`px-3 py-1 ${sb.bg} ${sb.text} text-xs font-bold rounded-full border shadow-sm flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />
              {sb.label}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/pacientes/${patientId}/editar`}>
            <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-bold py-2.5 px-5 rounded-full transition-all flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>Editar
            </button>
          </Link>
          <button onClick={() => { setWhatsappTemplate('free'); setWhatsappOpen(true) }} className="bg-[#820AD1] hover:bg-[#820AD1]/90 text-white text-sm font-bold py-2.5 px-5 rounded-full transition-all shadow-lg shadow-[#820AD1]/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">chat</span>Mensagem
          </button>
        </div>
      </div>

      {/* Patient Info Card */}
      <section className="glass-card-strong rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#820AD1]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center relative z-10">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start w-full xl:w-auto">
            <div className="shrink-0">
              <div className="rounded-[1.5rem] size-28 shadow-lg border-4 border-white flex items-center justify-center" style={{ background: "linear-gradient(135deg, #820AD1 0%, #C084FC 100%)" }}>
                <span className="text-white text-4xl font-bold">{patient.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-center sm:text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {age !== null && (
                  <InfoItem icon="cake" iconBg="bg-purple-50" iconColor="text-[#820AD1]" label="Idade" value={`${age} anos${birthFmt ? ` (${birthFmt})` : ""}`} />
                )}
                {patient.email && (
                  <InfoItem icon="mail" iconBg="bg-blue-50" iconColor="text-blue-600" label="Email" value={patient.email} />
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                    <div className="bg-pink-50 p-1.5 rounded-lg text-pink-600">
                      <span className="material-symbols-outlined text-[18px]">phone</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Telefone</span>
                      <span className="text-sm font-semibold text-gray-900">{patient.phone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hidden xl:block w-px h-24 bg-gray-200" />
          <div className="flex flex-col sm:flex-row gap-8 w-full xl:w-auto justify-between xl:justify-start">
            {(patient.guardianName || patient.guardianPhone) && (
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 rounded-full p-2 text-gray-500">
                  <span className="material-symbols-outlined">family_restroom</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Responsável</span>
                  <p className="text-sm font-bold text-gray-900">{patient.guardianName}{patient.guardianRelationship ? ` (${patient.guardianRelationship})` : ""}</p>
                  {patient.guardianPhone && <p className="text-xs text-gray-600 font-medium">{patient.guardianPhone}</p>}
                </div>
              </div>
            )}
            {lastSession && (
              <div className="flex items-center gap-3">
                <div className="bg-green-50 rounded-full p-2 text-green-600">
                  <span className="material-symbols-outlined">event_available</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Última Sessão</span>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(lastSession.dateTime).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })},{" "}
                    {new Date(lastSession.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span> Realizada
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Documents Section */}
          <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shadow-sm shadow-blue-100">
                  <span className="material-symbols-outlined">folder_open</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Documentos e Relatórios</h3>
                  <p className="text-xs text-gray-600 font-medium">{reports.length} arquivo(s)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/pacientes/${patientId}/novo-relatorio`}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-bold rounded-full transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                    <span className="hidden sm:inline">Gravar Áudio</span>
                  </button>
                </Link>
                <Link href={`/dashboard/relatorios/novo?patientId=${patientId}`}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-full shadow-lg hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                </Link>
              </div>
            </div>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#820AD1] transition-colors text-[20px]">search</span>
              <input type="text" value={docSearch} onChange={(e) => setDocSearch(e.target.value)} placeholder="Pesquisar documentos..." className="w-full bg-white border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/30 shadow-sm transition-all placeholder:text-gray-400 text-gray-900" />
            </div>
            <div className="flex flex-col gap-2">
              {reportsLoading ? (
                <div className="flex justify-center py-6"><span className="material-symbols-outlined animate-spin text-[#820AD1]">progress_activity</span></div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">note_stack</span>
                  <p className="text-sm text-gray-500">Nenhum documento ainda.</p>
                </div>
              ) : (
                reports.filter((r) => !docSearch || r.title.toLowerCase().includes(docSearch.toLowerCase())).slice(0, 5).map((report) => {
                  const icMap: Record<string, { icon: string; color: string }> = {
                    evaluation: { icon: "picture_as_pdf", color: "bg-red-50 text-red-500" },
                    evolution: { icon: "graphic_eq", color: "bg-purple-50 text-[#820AD1]" },
                  }
                  const ic = icMap[report.type] || { icon: "description", color: "bg-blue-50 text-blue-500" }
                  return (
                    <div key={report.id} onClick={() => router.push(`/dashboard/pacientes/${patientId}/revisar-relatorio?reportId=${report.id}`)} className="group flex items-center justify-between p-3.5 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-md transition-all cursor-pointer bg-white/40">
                      <div className="flex items-center gap-4">
                        <div className={`size-11 rounded-xl ${ic.color} flex items-center justify-center shrink-0`}>
                          <span className="material-symbols-outlined">{ic.icon}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-[#820AD1] transition-colors">{report.title}</span>
                          <span className="text-xs text-gray-600 font-medium">{formatReportDate(report.createdAt)} • {formatReportType(report.type)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors" title="Visualizar"><span className="material-symbols-outlined text-[20px]">visibility</span></button>
                        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors" title="Baixar"><span className="material-symbols-outlined text-[20px]">download</span></button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {reports.length > 5 && (
              <Link href={`/dashboard/pacientes/${patientId}/documentos`} className="w-full py-3 border-t border-gray-100 text-sm text-[#820AD1] font-bold hover:bg-[#820AD1]/5 rounded-b-xl transition-colors flex items-center justify-center gap-2">
                Ver todos os documentos<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            )}
          </section>

          {/* Communication History */}
          <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2.5 rounded-xl text-green-600 shadow-sm shadow-green-100">
                  <span className="material-symbols-outlined">forum</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Histórico de Comunicação</h3>
                  <p className="text-xs text-gray-600 font-medium">{completed.length > 0 ? `${completed.length} sessões realizadas` : "Sem interações ainda"}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
            <div className="relative pl-4 space-y-8 before:content-[''] before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
              {completed.slice(0, 3).map((apt) => (
                <div key={apt.id} className="relative flex gap-5 pl-4 group">
                  <div className="absolute left-0 top-1.5 size-3.5 bg-green-500 rounded-full border-[3px] border-white shadow-sm z-10 box-content" />
                  <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group-hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
                        <span className="text-sm font-bold text-gray-900">Sessão Realizada</span>
                      </div>
                      <span className="text-xs text-gray-600 font-medium">
                        {new Date(apt.dateTime).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })},{" "}
                        {new Date(apt.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{apt.type ? `${apt.type} — ` : ""}{apt.duration} min</p>
                  </div>
                </div>
              ))}
              {reports.slice(0, 2).map((report) => (
                <div key={report.id} className="relative flex gap-5 pl-4 group">
                  <div className="absolute left-0 top-1.5 size-3.5 bg-blue-400 rounded-full border-[3px] border-white shadow-sm z-10 box-content" />
                  <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group-hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-blue-500">description</span>
                        <span className="text-sm font-bold text-gray-900">{report.title}</span>
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{formatReportDate(report.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{formatReportType(report.type)}</p>
                  </div>
                </div>
              ))}
              {completed.length === 0 && reports.length === 0 && (
                <div className="text-center py-6"><p className="text-sm text-gray-500">Nenhuma interação registrada ainda.</p></div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Next Session */}
          <div className="glass-card rounded-[2rem] p-6 relative overflow-hidden group border-l-4 border-l-[#820AD1]/60">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#820AD1]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Próxima Sessão</h3>
              <span className="bg-[#820AD1]/10 text-[#820AD1] p-2 rounded-full">
                <span className="material-symbols-outlined text-[20px]">calendar_clock</span>
              </span>
            </div>
            {nextApt ? (
              <>
                <div className="flex flex-col gap-1 mb-6 relative z-10">
                  <span className="text-4xl font-bold text-gray-900 tracking-tight">
                    {new Date(nextApt.dateTime).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-base font-medium text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#820AD1]" />
                    {new Date(nextApt.dateTime).toLocaleDateString("pt-BR", { weekday: "long" })} •{" "}
                    {new Date(nextApt.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <button className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-gray-200 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 group-hover:scale-[1.02] transform duration-200">
                  Iniciar Sessão<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </>
            ) : (
              <div className="text-center py-4 relative z-10">
                <p className="text-sm text-gray-500 mb-3">Nenhuma sessão agendada</p>
                <Link href={`/dashboard/agendamentos/novo?patientId=${patientId}`}>
                  <button className="w-full py-3.5 bg-[#820AD1] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#820AD1]/20 hover:bg-[#820AD1]/90 transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">add</span>Agendar Sessão
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Smart Actions */}
          <div className="glass-card rounded-[2rem] p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="material-symbols-outlined text-[#820AD1] text-[22px]">auto_awesome</span>
              <h3 className="text-base font-bold text-gray-900">Smart Actions</h3>
            </div>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => { setWhatsappTemplate('reminder'); setWhatsappOpen(true) }} className="block w-full">
                <SmartActionBtn icon="chat" iconBg="bg-green-50" iconColor="text-green-600" title="Enviar Lembrete" desc={nextApt ? `Confirmar sessão do dia ${new Date(nextApt.dateTime).getDate()}` : "Sem sessão agendada"} />
              </button>
              <Link href={`/dashboard/pacientes/${patientId}/novo-relatorio`} className="block">
                <SmartActionBtn icon="mic" iconBg="bg-purple-50" iconColor="text-[#820AD1]" title="Novo Relatório" desc="Criar relatório por áudio" />
              </Link>
              <button type="button" onClick={() => { setWhatsappTemplate('feedback'); setWhatsappOpen(true) }} className="block w-full">
                <SmartActionBtn icon="assignment_turned_in" iconBg="bg-orange-50" iconColor="text-orange-500" title="Solicitar Feedback" desc="Questionário pós-avaliação" />
              </button>
            </div>
          </div>

          {/* Status Card */}
          <div className="rounded-[2rem] bg-linear-to-br from-[#f8f5fa] to-white p-6 flex flex-col items-center text-center justify-center min-h-[180px] relative overflow-hidden border border-gray-200 shadow-sm">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#820AD1 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-3 z-10 ring-1 ring-gray-100">
              <span className="material-symbols-outlined text-[#820AD1] text-[28px]">folder_managed</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 z-10">{reports.length > 0 ? "Documentação em Dia!" : "Sem Documentos"}</h3>
            <p className="text-xs text-gray-600 mt-1 max-w-[200px] z-10 font-medium">
              {reports.length > 0 ? `${reports.length} relatório(s) arquivado(s) com sucesso.` : "Crie o primeiro relatório para este paciente."}
            </p>
          </div>

          {/* Actions Card */}
          <div className="glass-card rounded-[2rem] p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="material-symbols-outlined text-gray-500 text-[22px]">settings</span>
              <h3 className="text-base font-bold text-gray-900">Ações</h3>
            </div>
            <div className="flex flex-col gap-2">
              {patient.status === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button disabled={mutationLoading} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all text-left group">
                      <div className="bg-amber-50 text-amber-600 p-2.5 rounded-lg"><span className="material-symbols-outlined text-[20px]">school</span></div>
                      <span className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Dar Alta</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Alta</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza que deseja dar alta para {patient.name}?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDischarge} className="bg-[#820AD1] hover:bg-[#820AD1]/90">Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {patient.status === "discharged" && (
                <button onClick={handleReactivate} disabled={mutationLoading} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-green-300 hover:shadow-md transition-all text-left group">
                  <div className="bg-green-50 text-green-600 p-2.5 rounded-lg"><span className="material-symbols-outlined text-[20px]">refresh</span></div>
                  <span className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">Reativar Paciente</span>
                </button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button disabled={mutationLoading} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-red-300 hover:shadow-md transition-all text-left group">
                    <div className="bg-red-50 text-red-500 p-2.5 rounded-lg"><span className="material-symbols-outlined text-[20px]">delete</span></div>
                    <span className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">Excluir Paciente</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>Tem certeza que deseja excluir {patient.name}? Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      <WhatsAppMessageModal
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        patient={{
          id: patientId,
          name: patient.name,
          guardianName: patient.guardianName,
          guardianPhone: patient.guardianPhone,
          guardianRelationship: patient.guardianRelationship,
        }}
        nextAppointment={nextApt ? { dateTime: nextApt.dateTime, type: nextApt.type, duration: nextApt.duration } : null}
        defaultTemplate={whatsappTemplate}
      />
    </div>
    </div>
  )
}

function InfoItem({ icon, iconBg, iconColor, label, value }: { icon: string; iconBg: string; iconColor: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <div className={`${iconBg} p-1.5 rounded-lg ${iconColor}`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>
    </div>
  )
}

function SmartActionBtn({ icon, iconBg, iconColor, title, desc }: { icon: string; iconBg: string; iconColor: string; title: string; desc: string }) {
  return (
    <button className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-[#820AD1]/30 hover:shadow-md transition-all text-left group w-full">
      <div className={`${iconBg} ${iconColor} p-2.5 rounded-lg group-hover:bg-opacity-100 transition-colors`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex-1">
        <span className="block text-sm font-bold text-gray-900 group-hover:text-[#820AD1] transition-colors">{title}</span>
        <span className="block text-xs text-gray-600 font-medium">{desc}</span>
      </div>
      <span className="material-symbols-outlined text-gray-300 group-hover:text-[#820AD1] group-hover:translate-x-1 transition-all">chevron_right</span>
    </button>
  )
}
