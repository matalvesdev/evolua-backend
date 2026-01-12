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
    if (result.success) {
      router.push("/pacientes")
    }
  }

  const handleDischarge = async () => {
    const result = await discharge(patientId, new Date())
    if (result.success) {
      refetch()
    }
  }

  const handleReactivate = async () => {
    const result = await reactivate(patientId)
    if (result.success) {
      refetch()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error || "Paciente não encontrado"}
          </p>
          <Link href="/pacientes">
            <Button variant="outline">Voltar para lista</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: "Ativo", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    inactive: { label: "Inativo", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    discharged: { label: "Alta", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    "on-hold": { label: "Em espera", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  }

  const status = statusConfig[patient.status] ?? { label: patient.status, color: "bg-gray-100 text-gray-800" }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {patient.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {patient.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                {status.label}
              </span>
              {patient.phone && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  📞 {patient.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/pacientes/${patientId}/editar`}>
            <Button variant="outline" size="sm">
              <span className="material-symbols-outlined text-base mr-1">edit</span>
              Editar
            </Button>
          </Link>
          <Link href={`/dashboard/pacientes/${patientId}/audio`}>
            <Button variant="outline" size="sm">
              <span className="material-symbols-outlined text-base mr-1">mic</span>
              Áudio/Transcrição
            </Button>
          </Link>
          <Link href={`/dashboard/agendamentos/novo?patientId=${patientId}`}>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              <span className="material-symbols-outlined text-base mr-1">add</span>
              Agendar
            </Button>
          </Link>
          <Link href={`/dashboard/relatorios/novo?patientId=${patientId}`}>
            <Button size="sm" variant="outline">
              <span className="material-symbols-outlined text-base mr-1">description</span>
              Novo Relatório
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: "info", label: "Informações" },
          { id: "appointments", label: `Sessões (${appointments.length})` },
          { id: "reports", label: `Relatórios (${reports.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Dados Pessoais
            </h3>
            <div className="space-y-3">
              <InfoRow label="Nome" value={patient.name} />
              <InfoRow label="Email" value={patient.email || "Não informado"} />
              <InfoRow label="Telefone" value={patient.phone || "Não informado"} />
              <InfoRow
                label="Data de Nascimento"
                value={
                  patient.birthDate
                    ? new Date(patient.birthDate).toLocaleDateString("pt-BR")
                    : "Não informado"
                }
              />
              <InfoRow label="CPF" value={patient.cpf || "Não informado"} />
            </div>
          </Card>

          {/* Responsável */}
          {(patient.guardianName || patient.guardianPhone) && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Responsável
              </h3>
              <div className="space-y-3">
                <InfoRow label="Nome" value={patient.guardianName || "Não informado"} />
                <InfoRow label="Telefone" value={patient.guardianPhone || "Não informado"} />
                <InfoRow label="Parentesco" value={patient.guardianRelationship || "Não informado"} />
              </div>
            </Card>
          )}

          {/* Endereço */}
          {patient.address && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Endereço
              </h3>
              <div className="space-y-3">
                <InfoRow
                  label="Endereço"
                  value={
                    patient.address.street
                      ? `${patient.address.street}, ${patient.address.number || "S/N"}`
                      : "Não informado"
                  }
                />
                <InfoRow label="Bairro" value={patient.address.neighborhood || "Não informado"} />
                <InfoRow
                  label="Cidade/Estado"
                  value={
                    patient.address.city
                      ? `${patient.address.city} - ${patient.address.state || ""}`
                      : "Não informado"
                  }
                />
                <InfoRow label="CEP" value={patient.address.zipCode || "Não informado"} />
              </div>
            </Card>
          )}

          {/* Histórico Médico */}
          {patient.medicalHistory && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Histórico Médico
              </h3>
              <div className="space-y-3">
                {patient.medicalHistory.diagnosis && patient.medicalHistory.diagnosis.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Diagnósticos</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {patient.medicalHistory.diagnosis.map((d, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {patient.medicalHistory.medications && patient.medicalHistory.medications.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Medicamentos</p>
                    <p className="text-gray-900 dark:text-white">
                      {patient.medicalHistory.medications.join(", ")}
                    </p>
                  </div>
                )}
                {patient.medicalHistory.allergies && patient.medicalHistory.allergies.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Alergias</p>
                    <p className="text-red-600 dark:text-red-400">
                      {patient.medicalHistory.allergies.join(", ")}
                    </p>
                  </div>
                )}
                {patient.medicalHistory.notes && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Observações</p>
                    <p className="text-gray-900 dark:text-white">{patient.medicalHistory.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Ações */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ações</h3>
            <div className="flex flex-wrap gap-3">
              {patient.status === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={mutationLoading}>
                      🎓 Dar Alta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Alta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja dar alta para {patient.name}? Você poderá reativar o
                        paciente posteriormente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDischarge}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {patient.status === "discharged" && (
                <Button variant="outline" onClick={handleReactivate} disabled={mutationLoading}>
                  ♻️ Reativar Paciente
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={mutationLoading}>
                    🗑️ Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {patient.name}? Esta ação não pode ser desfeita
                      e todos os dados do paciente serão perdidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-4">
          {appointmentsLoading ? (
            <p className="text-gray-600 dark:text-gray-400">Carregando sessões...</p>
          ) : appointments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nenhuma sessão encontrada para este paciente.
              </p>
              <Link href={`/agendamentos/novo?patientId=${patientId}`}>
                <Button className="bg-purple-600 hover:bg-purple-700">Agendar Sessão</Button>
              </Link>
            </Card>
          ) : (
            appointments.map((appointment) => (
              <Card key={appointment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(appointment.dateTime).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(appointment.dateTime).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      - {appointment.duration} min
                    </p>
                  </div>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4">
          {reportsLoading ? (
            <p className="text-gray-600 dark:text-gray-400">Carregando relatórios...</p>
          ) : reports.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nenhum relatório encontrado para este paciente.
              </p>
              <Link href={`/relatorios/novo?patientId=${patientId}`}>
                <Button className="bg-purple-600 hover:bg-purple-700">Criar Relatório</Button>
              </Link>
            </Card>
          ) : (
            reports.map((report) => (
              <Link key={report.id} href={`/relatorios/${report.id}`}>
                <Card className="p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{report.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {report.type} •{" "}
                        {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <ReportStatusBadge status={report.status} />
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Agendado", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    confirmed: { label: "Confirmado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    "in-progress": { label: "Em andamento", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    completed: { label: "Concluído", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  }

  const config = statusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-800" }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

function ReportStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    pending_review: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    reviewed: { label: "Revisado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    sent: { label: "Enviado", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  }

  const config = statusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-800" }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}
