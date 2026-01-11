"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAppointmentMutations, usePatients } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CreateAppointmentInput, AppointmentType } from "@/lib/core"

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedPatientId = searchParams.get("patientId")

  const { create, loading, error } = useAppointmentMutations()
  const { patients, loading: patientsLoading } = usePatients({ limit: 100 })

  const [formData, setFormData] = React.useState<Omit<CreateAppointmentInput, "therapistId">>({
    patientId: preSelectedPatientId || "",
    dateTime: "",
    duration: 50,
    type: "regular",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // O therapistId será preenchido pelo backend com o usuário atual
    const result = await create({
      ...formData,
      therapistId: "", // Será preenchido pelo server action
    })

    if (result.success) {
      router.push("/dashboard/agendamentos")
    }
  }

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Gerar horários disponíveis (07:00 às 20:00)
  const timeSlots = React.useMemo(() => {
    const slots: string[] = []
    for (let hour = 7; hour <= 20; hour++) {
      for (const minute of [0, 30]) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        slots.push(time)
      }
    }
    return slots
  }, [])

  const [selectedDate, setSelectedDate] = React.useState("")
  const [selectedTime, setSelectedTime] = React.useState("")

  React.useEffect(() => {
    if (selectedDate && selectedTime) {
      setFormData(prev => ({ ...prev, dateTime: `${selectedDate}T${selectedTime}:00` }))
    }
  }, [selectedDate, selectedTime])

  const appointmentTypes: { value: AppointmentType; label: string; description: string }[] = [
    { value: "regular", label: "Sessão Regular", description: "Atendimento de rotina" },
    { value: "evaluation", label: "Avaliação", description: "Primeira consulta ou avaliação completa" },
    { value: "reevaluation", label: "Reavaliação", description: "Reavaliação do progresso" },
    { value: "discharge", label: "Alta", description: "Sessão de encerramento do tratamento" },
  ]

  const durations = [
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 50, label: "50 min" },
    { value: 60, label: "1 hora" },
    { value: 90, label: "1h30" },
    { value: 120, label: "2 horas" },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Novo Agendamento
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Agende uma nova sessão
          </p>
        </div>
        <Link href="/dashboard/agendamentos">
          <Button variant="ghost">← Voltar</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selecionar Paciente */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Paciente
          </h2>

          {patientsLoading ? (
            <p className="text-gray-600 dark:text-gray-400">Carregando pacientes...</p>
          ) : (
            <div>
              <Label htmlFor="patientId">Selecione o paciente *</Label>
              <select
                id="patientId"
                value={formData.patientId}
                onChange={(e) => updateField("patientId", e.target.value)}
                required
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Selecione um paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Card>

        {/* Data e Horário */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data e Horário
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Horário *</Label>
              <select
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            <Label>Duração *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => updateField("duration", d.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.duration === d.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Tipo de Sessão */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tipo de Sessão
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {appointmentTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateField("type", type.value)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.type === type.value
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

        {/* Observações */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Observações
          </h2>

          <div>
            <Label htmlFor="notes">Notas adicionais</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Observações sobre a sessão..."
              rows={4}
            />
          </div>
        </Card>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/agendamentos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || !formData.patientId || !formData.dateTime}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? "Agendando..." : "Agendar Sessão"}
          </Button>
        </div>
      </form>
    </div>
  )
}
