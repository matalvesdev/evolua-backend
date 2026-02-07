"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePatientMutations, useAppointmentMutations, useReportMutations, usePatients } from "@/hooks"

type ModalType = "patient" | "appointment" | "report" | null

interface QuickAction {
  icon: string
  label: string
  modalType: ModalType
}

const quickActions: QuickAction[] = [
  { icon: "person_add", label: "Novo Paciente", modalType: "patient" },
  { icon: "event", label: "Agendar Sessão", modalType: "appointment" },
  { icon: "mic", label: "Gravar Relatório", modalType: "report" },
]

export function QuickActionsBar() {
  const router = useRouter()
  const [openModal, setOpenModal] = React.useState<ModalType>(null)

  const { createPatient, isCreating: patientLoading } = usePatientMutations()
  const { createAppointment, isCreating: appointmentLoading } = useAppointmentMutations()
  const { createReport, isCreating: reportLoading } = useReportMutations()
  const { patients } = usePatients({ limit: 100 })

  const [patientData, setPatientData] = React.useState({ name: "", email: "", phone: "" })
  const [appointmentData, setAppointmentData] = React.useState({ patientId: "", dateTime: "", duration: 50 })
  const [reportData, setReportData] = React.useState<{ patientId: string; type: "evolution" | "evaluation" | "discharge" | "monthly"; title: string; content: string }>({ patientId: "", type: "evolution", title: "", content: "" })

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const patient = await createPatient({
        fullName: patientData.name,
        email: patientData.email || undefined,
        phone: patientData.phone || undefined,
      })
      setOpenModal(null)
      setPatientData({ name: "", email: "", phone: "" })
      router.push(`/dashboard/pacientes/${patient.id}`)
    } catch { /* handled by mutation */ }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAppointment({
        patientId: appointmentData.patientId,
        dateTime: appointmentData.dateTime,
        duration: appointmentData.duration,
        type: "regular",
      })
      setOpenModal(null)
      setAppointmentData({ patientId: "", dateTime: "", duration: 50 })
      router.push("/dashboard/agendamentos")
    } catch { /* handled by mutation */ }
  }

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createReport({
        patientId: reportData.patientId,
        type: reportData.type,
        title: reportData.title,
        content: reportData.content,
      })
      setOpenModal(null)
      setReportData({ patientId: "", type: "evolution", title: "", content: "" })
      router.push("/dashboard/relatorios")
    } catch { /* handled by mutation */ }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="flex-1 min-w-40 flex flex-col sm:flex-row items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-2xl shadow-lg shadow-purple-200 transition-all hover:-translate-y-0.5 active:scale-95 group"
            onClick={() => setOpenModal(action.modalType)}
          >
            <span className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <span className="material-symbols-outlined">{action.icon}</span>
            </span>
            <span className="font-bold text-sm">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Modal Novo Paciente */}
      <Dialog open={openModal === "patient"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>Crie um novo paciente rapidamente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePatient} className="space-y-4">
            <div>
              <Label htmlFor="patient-name">Nome *</Label>
              <Input
                id="patient-name"
                value={patientData.name}
                onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                required
                placeholder="Nome completo do paciente"
              />
            </div>
            <div>
              <Label htmlFor="patient-email">Email</Label>
              <Input
                id="patient-email"
                type="email"
                value={patientData.email}
                onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="patient-phone">Telefone</Label>
              <Input
                id="patient-phone"
                value={patientData.phone}
                onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={patientLoading || !patientData.name}>
                {patientLoading ? "Criando..." : "Criar Paciente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Agendar Sessão */}
      <Dialog open={openModal === "appointment"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Sessão</DialogTitle>
            <DialogDescription>Agende uma nova sessão rapidamente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            <div>
              <Label htmlFor="appointment-patient">Paciente *</Label>
              <select
                id="appointment-patient"
                value={appointmentData.patientId}
                onChange={(e) => setAppointmentData({ ...appointmentData, patientId: e.target.value })}
                required
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Selecione um paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="appointment-datetime">Data e Hora *</Label>
              <Input
                id="appointment-datetime"
                type="datetime-local"
                value={appointmentData.dateTime}
                onChange={(e) => setAppointmentData({ ...appointmentData, dateTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="appointment-duration">Duração (minutos) *</Label>
              <Input
                id="appointment-duration"
                type="number"
                value={appointmentData.duration}
                onChange={(e) => setAppointmentData({ ...appointmentData, duration: parseInt(e.target.value) })}
                required
                min="15"
                step="15"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={appointmentLoading || !appointmentData.patientId || !appointmentData.dateTime}>
                {appointmentLoading ? "Agendando..." : "Agendar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Gravar Relatório */}
      <Dialog open={openModal === "report"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Relatório</DialogTitle>
            <DialogDescription>Crie um novo relatório rapidamente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateReport} className="space-y-4">
            <div>
              <Label htmlFor="report-patient">Paciente *</Label>
              <select
                id="report-patient"
                value={reportData.patientId}
                onChange={(e) => setReportData({ ...reportData, patientId: e.target.value })}
                required
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Selecione um paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="report-type">Tipo de Relatório *</Label>
              <select
                id="report-type"
                value={reportData.type}
                onChange={(e) => setReportData({ ...reportData, type: e.target.value as "evolution" | "evaluation" | "discharge" | "monthly" })}
                required
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="evolution">Evolução</option>
                <option value="evaluation">Avaliação</option>
                <option value="discharge">Alta</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            <div>
              <Label htmlFor="report-title">Título *</Label>
              <Input
                id="report-title"
                value={reportData.title}
                onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                required
                placeholder="Título do relatório"
              />
            </div>
            <div>
              <Label htmlFor="report-content">Conteúdo *</Label>
              <Textarea
                id="report-content"
                value={reportData.content}
                onChange={(e) => setReportData({ ...reportData, content: e.target.value })}
                required
                placeholder="Digite o conteúdo do relatório..."
                rows={6}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={reportLoading || !reportData.patientId || !reportData.title || !reportData.content}>
                {reportLoading ? "Criando..." : "Criar Relatório"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

