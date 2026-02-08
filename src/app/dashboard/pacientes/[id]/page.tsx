"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { usePatient, usePatientMutations, usePatientReports, useAppointments } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string

  const { patient, loading, error, refetch } = usePatient(patientId)
  const { reports, loading: reportsLoading } = usePatientReports(patientId)
  const { appointments, loading: appointmentsLoading } = useAppointments({ patientId })
  const { remove, discharge, reactivate, loading: mutationLoading } = usePatientMutations()

  const [activeTab, setActiveTab] = React.useState<"info" | "appointments" | "reports">("info")

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
          <span className="material-symbols-outlined animate-spin text-purple-600 text-3xl">progress_activity</span>
          <p className="text-gray-500 mt-3 text-sm">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">person_off</span>
          <p className="text-red-600 dark:text-red-400 mb-4">{error?.message || "Paciente não encontrado"}</p>
          <Link href="/dashboard/pacientes"><Button variant="outline">Voltar para lista</Button></Link>
        </Card>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    active: { label: "Ativo", color: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: "check_circle" },
    inactive: { label: "Inativo", color: "bg-amber-50 text-amber-700 border border-amber-200", icon: "pause_circle" },
    discharged: { label: "Alta", color: "bg-slate-50 text-slate-600 border border-slate-200", icon: "verified" },
    "on-hold": { label: "Em espera", color: "bg-orange-50 text-orange-700 border border-orange-200", icon: "schedule" },
  }

  const status = statusConfig[patient.status] ?? { label: patient.status, color: "bg-gray-100 text-gray-800", icon: "help" }
  const addr = patient.address

  const completedAppointments = appointments.filter((a) => a.status === "completed").length
  const age = patient.birthDate
    ? Math.floor((new Date().getTime() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-2 sm:px-0 pb-8">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/pacientes")}
        className="flex items-center gap-1.5 text-gray-500 hover:text-purple-600 transition-colors text-sm group"
      >
        <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        Pacientes
      </button>

      {/* Hero Card */}
      <Card className="overflow-hidden">
        <div className="bg-linear-to-r from-purple-600 via-purple-500 to-violet-500 px-6 py-8 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {patient.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{patient.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-white/20 text-white backdrop-blur-sm`}>
                    <span className="material-symbols-outlined text-sm">{status.icon}</span>
                    {status.label}
                  </span>
                  {age !== null && (
                    <span className="text-sm text-white/80">{age} anos</span>
                  )}
                  {patient.phone && (
                    <span className="text-sm text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">phone</span>
                      {patient.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-4 sm:px-8 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/pacientes/${patientId}/editar`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <span className="material-symbols-outlined text-base">edit</span>
                Editar
              </Button>
            </Link>
            <Link href={`/dashboard/pacientes/${patientId}/novo-relatorio`}>
              <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700">
                <span className="material-symbols-outlined text-base">mic</span>
                Relatório por Áudio
              </Button>
            </Link>
            <Link href={`/dashboard/pacientes/${patientId}/audio`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <span className="material-symbols-outlined text-base">headphones</span>
                Sessões de Áudio
              </Button>
            </Link>
            <Link href={`/dashboard/agendamentos/novo?patientId=${patientId}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <span className="material-symbols-outlined text-base">calendar_add_on</span>
                Agendar
              </Button>
            </Link>
            <Link href={`/dashboard/relatorios/novo?patientId=${patientId}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <span className="material-symbols-outlined text-base">description</span>
                Relatório
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon="event_available"
          label="Sessões"
          value={String(appointments.length)}
          color="purple"
        />
        <StatCard
          icon="check_circle"
          label="Concluídas"
          value={String(completedAppointments)}
          color="emerald"
        />
        <StatCard
          icon="description"
          label="Relatórios"
          value={String(reports.length)}
          color="blue"
        />
        <StatCard
          icon="calendar_today"
          label="Início"
          value={patient.startDate ? new Date(patient.startDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—"}
          color="amber"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: "info", label: "Informações", icon: "person" },
          { id: "appointments", label: `Sessões (${appointments.length})`, icon: "event" },
          { id: "reports", label: `Relatórios (${reports.length})`, icon: "description" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dados Pessoais */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-purple-500 text-lg">badge</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">Dados Pessoais</h3>
            </div>
            <div className="space-y-3">
              <InfoRow icon="person" label="Nome" value={patient.name} />
              <InfoRow icon="mail" label="Email" value={patient.email || "Não informado"} />
              <InfoRow icon="phone" label="Telefone" value={patient.phone || "Não informado"} />
              <InfoRow icon="cake" label="Data de Nascimento" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR") : "Não informado"} />
              <InfoRow icon="id_card" label="CPF" value={patient.cpf || "Não informado"} />
            </div>
          </Card>

          {/* Responsável */}
          {(patient.guardianName || patient.guardianPhone) && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-purple-500 text-lg">family_restroom</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Responsável</h3>
              </div>
              <div className="space-y-3">
                <InfoRow icon="person" label="Nome" value={patient.guardianName || "Não informado"} />
                <InfoRow icon="phone" label="Telefone" value={patient.guardianPhone || "Não informado"} />
                <InfoRow icon="group" label="Parentesco" value={patient.guardianRelationship || "Não informado"} />
              </div>
            </Card>
          )}

          {/* Endereço */}
          {addr && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-purple-500 text-lg">location_on</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Endereço</h3>
              </div>
              <div className="space-y-3">
                <InfoRow icon="home" label="Rua" value={`${addr.street || "—"}${addr.number ? `, ${addr.number}` : ""}`} />
                {addr.complement && <InfoRow icon="apartment" label="Complemento" value={addr.complement} />}
                <InfoRow icon="map" label="Bairro" value={addr.neighborhood || "Não informado"} />
                <InfoRow icon="location_city" label="Cidade/UF" value={`${addr.city || "—"} / ${addr.state || "—"}`} />
                <InfoRow icon="pin_drop" label="CEP" value={addr.zipCode || "Não informado"} />
              </div>
            </Card>
          )}

          {/* Histórico Médico */}
          {patient.medicalHistory && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-purple-500 text-lg">medical_information</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Histórico Médico</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {patient.medicalHistory.notes || "Sem observações"}
              </p>
            </Card>
          )}

          {/* Ações */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-purple-500 text-lg">settings</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">Ações</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {patient.status === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={mutationLoading} className="gap-1.5">
                      <span className="material-symbols-outlined text-base">school</span>
                      Dar Alta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Alta</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza que deseja dar alta para {patient.name}?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDischarge}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {patient.status === "discharged" && (
                <Button variant="outline" onClick={handleReactivate} disabled={mutationLoading} className="gap-1.5">
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Reativar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={mutationLoading} className="gap-1.5">
                    <span className="material-symbols-outlined text-base">delete</span>
                    Excluir
                  </Button>
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
          </Card>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-3">
          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-purple-600 text-2xl">progress_activity</span>
            </div>
          ) : appointments.length === 0 ? (
            <Card className="p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">event_busy</span>
              <p className="text-gray-500 mb-4">Nenhuma sessão agendada ainda.</p>
              <Link href={`/dashboard/agendamentos/novo?patientId=${patientId}`}>
                <Button className="bg-purple-600 hover:bg-purple-700 gap-1.5">
                  <span className="material-symbols-outlined text-base">add</span>
                  Agendar Sessão
                </Button>
              </Link>
            </Card>
          ) : (
            appointments.map((apt) => (
              <Card key={apt.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">event</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(apt.dateTime).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {new Date(apt.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — {apt.duration} min
                      {apt.type && (
                        <>
                          <span className="text-gray-300">•</span>
                          {apt.type}
                        </>
                      )}
                    </p>
                  </div>
                  <AppointmentBadge status={apt.status} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-3">
          {reportsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-purple-600 text-2xl">progress_activity</span>
            </div>
          ) : reports.length === 0 ? (
            <Card className="p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">note_stack</span>
              <p className="text-gray-500 mb-4">Nenhum relatório criado ainda.</p>
              <div className="flex gap-2 justify-center">
                <Link href={`/dashboard/pacientes/${patientId}/novo-relatorio`}>
                  <Button className="bg-purple-600 hover:bg-purple-700 gap-1.5">
                    <span className="material-symbols-outlined text-base">mic</span>
                    Relatório por Áudio
                  </Button>
                </Link>
                <Link href={`/dashboard/relatorios/novo?patientId=${patientId}`}>
                  <Button variant="outline" className="gap-1.5">
                    <span className="material-symbols-outlined text-base">edit_note</span>
                    Relatório Manual
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            reports.map((report) => (
              <Card
                key={report.id}
                className="p-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
                onClick={() => router.push(`/dashboard/pacientes/${patientId}/revisar-relatorio?reportId=${report.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">description</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-purple-700 transition-colors truncate">
                      {report.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <span className="capitalize">{formatReportType(report.type)}</span>
                      <span className="text-gray-300">•</span>
                      {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <ReportBadge status={report.status} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || "bg-gray-50 text-gray-600"}`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-gray-400 text-base mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  )
}

function formatReportType(type: string): string {
  const map: Record<string, string> = {
    evaluation: "Avaliação",
    evolution: "Evolução",
    progress: "Progresso",
    discharge: "Alta",
    monthly: "Mensal",
    school: "Escolar",
    medical: "Médico",
    custom: "Personalizado",
    resumo: "Resumo",
    encaminhamento: "Encaminhamento",
    mensal: "Mensal",
    avaliacao: "Avaliação",
    alta: "Alta",
  }
  return map[type] || type
}

function AppointmentBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: string }> = {
    scheduled: { label: "Agendado", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "schedule" },
    confirmed: { label: "Confirmado", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "check" },
    "in-progress": { label: "Em andamento", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "play_arrow" },
    completed: { label: "Concluído", color: "bg-slate-50 text-slate-600 border-slate-200", icon: "done_all" },
    cancelled: { label: "Cancelado", color: "bg-red-50 text-red-600 border-red-200", icon: "close" },
  }
  const c = config[status] || { label: status, color: "bg-gray-50 text-gray-600 border-gray-200", icon: "help" }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${c.color}`}>
      <span className="material-symbols-outlined text-xs">{c.icon}</span>
      {c.label}
    </span>
  )
}

function ReportBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: string }> = {
    draft: { label: "Rascunho", color: "bg-slate-50 text-slate-600 border-slate-200", icon: "edit_note" },
    pending_review: { label: "Pendente", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "hourglass_top" },
    reviewed: { label: "Revisado", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "rate_review" },
    approved: { label: "Aprovado", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "verified" },
    sent: { label: "Enviado", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "send" },
  }
  const c = config[status] || { label: status, color: "bg-gray-50 text-gray-600 border-gray-200", icon: "help" }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${c.color}`}>
      <span className="material-symbols-outlined text-xs">{c.icon}</span>
      {c.label}
    </span>
  )
}
