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
import { Card } from "@/components/ui/card"
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

  const { create: createPatient, loading: patientLoading, error: patientError } = usePatientMutations()
  const { create: createAppointment, loading: appointmentLoading, error: appointmentError } = useAppointmentMutations()
  const { create: createReport, loading: reportLoading, error: reportError } = useReportMutations()
  const { patients, loading: patientsLoading } = usePatients({ limit: 100 })

  const [patientData, setPatientData] = React.useState({ 
    name: "", 
    email: "", 
    phone: "",
    birthDate: "",
    cpf: ""
  })
  
  const [selectedDate, setSelectedDate] = React.useState("")
  const [selectedTime, setSelectedTime] = React.useState("")
  const [appointmentData, setAppointmentData] = React.useState({ 
    patientId: "", 
    duration: 50,
    type: "regular" as const,
    notes: ""
  })
  
  const [reportData, setReportData] = React.useState({ 
    patientId: "", 
    type: "evolution" as const, 
    title: "", 
    content: "" 
  })

  // Gera horários de 30 em 30 minutos
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 7; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createPatient({
      ...patientData,
      address: { street: "", number: "", neighborhood: "", city: "", state: "", zipCode: "" },
      medicalHistory: { diagnosis: [], medications: [], allergies: [], notes: "" },
    })
    
    if (result.success) {
      setOpenModal(null)
      setPatientData({ name: "", email: "", phone: "", birthDate: "", cpf: "" })
      router.push(`/dashboard/pacientes/${result.data?.id}`)
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const dateTime = `${selectedDate}T${selectedTime}:00`
    
    const result = await createAppointment({
      patientId: appointmentData.patientId,
      dateTime,
      duration: appointmentData.duration,
      type: appointmentData.type,
      notes: appointmentData.notes,
      therapistId: "",
    })
    
    if (result.success) {
      setOpenModal(null)
      setSelectedDate("")
      setSelectedTime("")
      setAppointmentData({ patientId: "", duration: 50, type: "regular", notes: "" })
      router.push("/dashboard/agendamentos")
    }
  }

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createReport({
      ...reportData,
      therapistId: "",
      period: { startDate: "", endDate: "" },
    })
    
    if (result.success) {
      setOpenModal(null)
      setReportData({ patientId: "", type: "evolution", title: "", content: "" })
      router.push("/dashboard/relatorios")
    }
  }

  const appointmentTypes = [
    { value: "regular", label: "Terapia Regular", description: "Sessão de terapia padrão" },
    { value: "evaluation", label: "Avaliação", description: "Primeira avaliação do paciente" },
    { value: "followup", label: "Retorno", description: "Acompanhamento pós-alta" },
  ]

  const reportTypes = [
    { value: "evolution", label: "Evolução", description: "Relatório de evolução do paciente" },
    { value: "evaluation", label: "Avaliação", description: "Relatório de avaliação inicial" },
    { value: "discharge", label: "Alta", description: "Relatório de alta do tratamento" },
    { value: "monthly", label: "Mensal", description: "Resumo mensal do tratamento" },
  ]

  const selectedPatient = patients.find(p => p.id === reportData.patientId)
  const getTitleSuggestion = () => {
    if (!selectedPatient) return ""
    const typeLabels = {
      evolution: "Relatório de Evolução",
      evaluation: "Relatório de Avaliação",
      discharge: "Relatório de Alta",
      monthly: "Relatório Mensal"
    }
    return `${typeLabels[reportData.type]} - ${selectedPatient.name}`
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Novo Paciente</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Preencha os dados principais do paciente. Você poderá completar o cadastro depois.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePatient} className="space-y-6">
            <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Dados Pessoais</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient-name" className="text-gray-700 dark:text-gray-300">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="patient-name"
                    value={patientData.name}
                    onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                    required
                    placeholder="Digite o nome completo do paciente"
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patient-email" className="text-gray-700 dark:text-gray-300">Email</Label>
                    <Input
                      id="patient-email"
                      type="email"
                      value={patientData.email}
                      onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patient-phone" className="text-gray-700 dark:text-gray-300">Telefone</Label>
                    <Input
                      id="patient-phone"
                      value={patientData.phone}
                      onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patient-birthdate" className="text-gray-700 dark:text-gray-300">Data de Nascimento</Label>
                    <Input
                      id="patient-birthdate"
                      type="date"
                      value={patientData.birthDate}
                      onChange={(e) => setPatientData({ ...patientData, birthDate: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patient-cpf" className="text-gray-700 dark:text-gray-300">CPF</Label>
                    <Input
                      id="patient-cpf"
                      value={patientData.cpf}
                      onChange={(e) => setPatientData({ ...patientData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {patientError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                {patientError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={patientLoading || !patientData.name}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {patientLoading ? "Criando..." : "Criar Paciente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Agendar Sessão */}
      <Dialog open={openModal === "appointment"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Agendar Sessão</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Agende uma nova sessão com seu paciente
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAppointment} className="space-y-6">
            <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Paciente</h3>
              <div>
                <Label htmlFor="appointment-patient" className="text-gray-700 dark:text-gray-300">
                  Selecione o paciente <span className="text-red-500">*</span>
                </Label>
                {patientsLoading ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Carregando pacientes...</p>
                ) : (
                  <select
                    id="appointment-patient"
                    value={appointmentData.patientId}
                    onChange={(e) => setAppointmentData({ ...appointmentData, patientId: e.target.value })}
                    required
                    className="w-full mt-1.5 h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecione um paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Data e Horário</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appointment-date" className="text-gray-700 dark:text-gray-300">
                      Data <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="appointment-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                      min={new Date().toISOString().split("T")[0]}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appointment-time" className="text-gray-700 dark:text-gray-300">
                      Horário <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="appointment-time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required
                      className="w-full mt-1.5 h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="appointment-duration" className="text-gray-700 dark:text-gray-300">
                    Duração <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="appointment-duration"
                    value={appointmentData.duration}
                    onChange={(e) => setAppointmentData({ ...appointmentData, duration: parseInt(e.target.value) })}
                    required
                    className="w-full mt-1.5 h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="50">50 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                    <option value="120">2 horas</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tipo de Sessão</h3>
              <div className="grid gap-3">
                {appointmentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setAppointmentData({ ...appointmentData, type: type.value as any })}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      appointmentData.type === type.value
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                  </button>
                ))}
              </div>
            </Card>

            <div>
              <Label htmlFor="appointment-notes" className="text-gray-700 dark:text-gray-300">Observações</Label>
              <Textarea
                id="appointment-notes"
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                placeholder="Observações sobre a sessão..."
                rows={3}
                className="mt-1.5"
              />
            </div>

            {appointmentError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                {appointmentError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={appointmentLoading || !appointmentData.patientId || !selectedDate || !selectedTime}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {appointmentLoading ? "Agendando..." : "Agendar Sessão"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Gravar Relatório */}
      <Dialog open={openModal === "report"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Novo Relatório</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Crie um novo relatório de fonoaudiologia
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReport} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Paciente</h3>
                <div>
                  <Label htmlFor="report-patient" className="text-gray-700 dark:text-gray-300">
                    Selecione o paciente <span className="text-red-500">*</span>
                  </Label>
                  {patientsLoading ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Carregando...</p>
                  ) : (
                    <select
                      id="report-patient"
                      value={reportData.patientId}
                      onChange={(e) => {
                        setReportData({ ...reportData, patientId: e.target.value })
                        // Auto-sugerir título quando seleciona paciente
                        if (e.target.value && !reportData.title) {
                          const patient = patients.find(p => p.id === e.target.value)
                          if (patient) {
                            const suggestion = getTitleSuggestion()
                            if (suggestion) {
                              setReportData(prev => ({ ...prev, title: suggestion }))
                            }
                          }
                        }
                      }}
                      required
                      className="w-full mt-1.5 h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione um paciente</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </Card>

              <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tipo de Relatório</h3>
                <div className="grid gap-2">
                  {reportTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setReportData({ ...reportData, type: type.value as any })}
                      className={`p-2.5 border rounded-lg text-left transition-colors ${
                        reportData.type === type.value
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{type.label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{type.description}</p>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="report-title" className="text-gray-700 dark:text-gray-300">
                  Título do Relatório <span className="text-red-500">*</span>
                </Label>
                {selectedPatient && reportData.title !== getTitleSuggestion() && (
                  <button
                    type="button"
                    onClick={() => setReportData({ ...reportData, title: getTitleSuggestion() })}
                    className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    💡 Usar sugestão
                  </button>
                )}
              </div>
              <Input
                id="report-title"
                value={reportData.title}
                onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                required
                placeholder="Ex: Relatório de Evolução - João Silva"
                className="mt-1.5"
              />
              {selectedPatient && getTitleSuggestion() && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Sugestão: {getTitleSuggestion()}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="report-content" className="text-gray-700 dark:text-gray-300">
                Conteúdo do Relatório <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="report-content"
                value={reportData.content}
                onChange={(e) => setReportData({ ...reportData, content: e.target.value })}
                required
                placeholder="Digite o conteúdo do relatório...

## Objetivos
- 

## Atividades Realizadas
-

## Observações
-"
                rows={12}
                className="mt-1.5 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                💡 Dica: Use Markdown para formatar o relatório (## para títulos, - para listas)
              </p>
            </div>

            {reportError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                {reportError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenModal(null)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={reportLoading || !reportData.patientId || !reportData.title || !reportData.content}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {reportLoading ? "Criando..." : "Criar Relatório"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
