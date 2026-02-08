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
  getPatientStatusConfig,
  getAppointmentStatusConfig,
  getReportStatusConfig,
  formatReportType,
  formatAppointmentDate,
  formatAppointmentTime,
  formatReportDate,
} from "@/components/patient-profile/patient-profile-utils"

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
          <span className="material-symbols-outlined animate-spin text-[#8A05BE] text-3xl">progress_activity</span>
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
          <p className="text-red-600 dark:text-red-400 mb-4">{error?.message || "Paciente não encontrado"}</p>
          <Link href="/dashboard/pacientes"><Button variant="outline">Voltar para lista</Button></Link>
        </div>
      </div>
    )
  }

  const status = getPatientStatusConfig(patient.status)
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
        className="flex items-center gap-1.5 text-gray-500 hover:text-[#8A05BE] transition-colors text-sm group"
      >
        <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        Pacientes
      </button>

      {/* Hero Card with Gradient Header */}
      <div className="glass-card overflow-hidden">
        {/* Gradient Profile Header */}
        <div className="relative px-6 py-8 sm:px-8" style={{ background: "linear-gradient(135deg, #8A05BE 0%, #6D08AF 100%)" }}>
          {/* Decorative orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar initial with white border */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-white/80 bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {patient.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{patient.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${status.badgeBg} ${status.color}`}>
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
        <div className="px-6 py-4 sm:px-8 bg-white/60 backdrop-blur-sm border-t border-white/50">
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/pacientes/${patientId}/editar`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-gray-200 hover:border-[#8A05BE]/30 hover:bg-[#8A05BE]/5 transition-all">
                <span className="material-symbols-outlined text-base">edit</span>
                Editar
              </Button>
            </Link>
            <Link href={`/dashboard/pacientes/${patientId}/novo-relatorio`}>
              <Button size="sm" className="gap-1.5 bg-[#8A05BE] hover:bg-[#6D08AF] rounded-xl text-white shadow-md shadow-[#8A05BE]/20">
                <span className="material-symbols-outlined text-base">mic</span>
                Relatório por Áudio
              </Button>
            </Link>
            <Link href={`/dashboard/pacientes/${patientId}/audio`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-gray-200 hover:border-[#8A05BE]/30 hover:bg-[#8A05BE]/5 transition-all">
                <span className="material-symbols-outlined text-base">headphones</span>
                Sessões de Áudio
              </Button>
            </Link>
            <Link href={`/dashboard/agendamentos/novo?patientId=${patientId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-gray-200 hover:border-[#8A05BE]/30 hover:bg-[#8A05BE]/5 transition-all">
                <span className="material-symbols-outlined text-base">calendar_add_on</span>
                Agendar
              </Button>
            </Link>
            <Link href={`/dashboard/relatorios/novo?patientId=${patientId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-gray-200 hover:border-[#8A05BE]/30 hover:bg-[#8A05BE]/5 transition-all">
                <span className="material-symbols-outlined text-base">description</span>
                Relatório
              </Button>
            </Link>
          </div>
        </div>
      </div>

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
      <div className="flex gap-1 border-b border-gray-200/60 overflow-x-auto">
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
                ? "border-[#8A05BE] text-[#8A05BE]"
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
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#8A05BE] text-lg">badge</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">Dados Pessoais</h3>
            </div>
            <div className="space-y-3">
              <InfoRow icon="person" label="Nome" value={patient.name} />
              <InfoRow icon="mail" label="Email" value={patient.email || "Não informado"} />
              <InfoRow icon="phone" label="Telefone" value={patient.phone || "Não informado"} />
              <InfoRow icon="cake" label="Data de Nascimento" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR") : "Não informado"} />
              <InfoRow icon="id_card" label="CPF" value={patient.cpf || "Não informado"} />
            </div>
          </div>

          {/* Responsável */}
          {(patient.guardianName || patient.guardianPhone) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#8A05BE] text-lg">family_restroom</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Responsável</h3>
              </div>
              <div className="space-y-3">
                <InfoRow icon="person" label="Nome" value={patient.guardianName || "Não informado"} />
                <InfoRow icon="phone" label="Telefone" value={patient.guardianPhone || "Não informado"} />
                <InfoRow icon="group" label="Parentesco" value={patient.guardianRelationship || "Não informado"} />
              </div>
            </div>
          )}

          {/* Endereço */}
          {addr && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#8A05BE] text-lg">location_on</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Endereço</h3>
              </div>
              <div className="space-y-3">
                <InfoRow icon="home" label="Rua" value={`${addr.street || "—"}${addr.number ? `, ${addr.number}` : ""}`} />
                {addr.complement && <InfoRow icon="apartment" label="Complemento" value={addr.complement} />}
                <InfoRow icon="map" label="Bairro" value={addr.neighborhood || "Não informado"} />
                <InfoRow icon="location_city" label="Cidade/UF" value={`${addr.city || "—"} / ${addr.state || "—"}`} />
                <InfoRow icon="pin_drop" label="CEP" value={addr.zipCode || "Não informado"} />
              </div>
            </div>
          )}

          {/* Histórico Médico */}
          {patient.medicalHistory && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#8A05BE] text-lg">medical_information</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">Histórico Médico</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {patient.medicalHistory.notes || "Sem observações"}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="glass-card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#8A05BE] text-lg">settings</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">Ações</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {patient.status === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={mutationLoading} className="gap-1.5 rounded-xl hover:border-[#8A05BE]/30">
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
                      <AlertDialogAction onClick={handleDischarge} className="bg-[#8A05BE] hover:bg-[#6D08AF]">Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {patient.status === "discharged" && (
                <Button variant="outline" onClick={handleReactivate} disabled={mutationLoading} className="gap-1.5 rounded-xl hover:border-[#8A05BE]/30">
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Reativar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={mutationLoading} className="gap-1.5 rounded-xl">
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
          </div>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-3">
          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[#8A05BE] text-2xl">progress_activity</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">event_busy</span>
              <p className="text-gray-500 mb-4">Nenhuma sessão agendada ainda.</p>
              <Link href={`/dashboard/agendamentos/novo?patientId=${patientId}`}>
                <Button className="bg-[#8A05BE] hover:bg-[#6D08AF] gap-1.5 rounded-xl shadow-md shadow-[#8A05BE]/20">
                  <span className="material-symbols-outlined text-base">add</span>
                  Agendar Sessão
                </Button>
              </Link>
            </div>
          ) : (
            appointments.map((apt) => (
              <div key={apt.id} className="glass-card-item p-4 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#8A05BE]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#8A05BE]">event</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatAppointmentDate(apt.dateTime)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {formatAppointmentTime(apt.dateTime)} — {apt.duration} min
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
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-3">
          {reportsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[#8A05BE] text-2xl">progress_activity</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">note_stack</span>
              <p className="text-gray-500 mb-4">Nenhum relatório criado ainda.</p>
              <div className="flex gap-2 justify-center">
                <Link href={`/dashboard/pacientes/${patientId}/novo-relatorio`}>
                  <Button className="bg-[#8A05BE] hover:bg-[#6D08AF] gap-1.5 rounded-xl shadow-md shadow-[#8A05BE]/20">
                    <span className="material-symbols-outlined text-base">mic</span>
                    Relatório por Áudio
                  </Button>
                </Link>
                <Link href={`/dashboard/relatorios/novo?patientId=${patientId}`}>
                  <Button variant="outline" className="gap-1.5 rounded-xl hover:border-[#8A05BE]/30">
                    <span className="material-symbols-outlined text-base">edit_note</span>
                    Relatório Manual
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="glass-card-item p-4 cursor-pointer group"
                onClick={() => router.push(`/dashboard/pacientes/${patientId}/revisar-relatorio?reportId=${report.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-blue-600">description</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-[#8A05BE] transition-colors truncate">
                      {report.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <span className="capitalize">{formatReportType(report.type)}</span>
                      <span className="text-gray-300">•</span>
                      {formatReportDate(report.createdAt)}
                    </p>
                  </div>
                  <ReportBadge status={report.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: "bg-[#8A05BE]/10 text-[#8A05BE]",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <div className="glass-card-item p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || "bg-gray-50 text-gray-600"}`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
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

function AppointmentBadge({ status }: { status: string }) {
  const c = getAppointmentStatusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${c.color}`}>
      <span className="material-symbols-outlined text-xs">{c.icon}</span>
      {c.label}
    </span>
  )
}

function ReportBadge({ status }: { status: string }) {
  const c = getReportStatusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${c.color}`}>
      <span className="material-symbols-outlined text-xs">{c.icon}</span>
      {c.label}
    </span>
  )
}
