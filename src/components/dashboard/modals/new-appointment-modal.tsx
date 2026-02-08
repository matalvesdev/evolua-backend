"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import {
  AppointmentProgressBar,
  PatientSearchInput,
  DatePickerCalendar,
  TimeSlotGrid,
  AppointmentOptions,
} from "@/components/appointment-booking"
import { usePatients, useAppointmentMutations, useAppointments, useUser } from "@/hooks"
import { Appointment as CoreAppointment } from "@/lib/core/domain/entities/appointment"

interface Patient {
  id: string
  name: string
  email: string
  avatar: string
}

interface TimeSlot {
  time: string
  available: boolean
}

const generateTimeSlots = (selectedDate: Date | null, existingAppointments: CoreAppointment[]): TimeSlot[] => {
  const slots: TimeSlot[] = []
  if (!selectedDate) return slots
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      const slotDateTime = new Date(selectedDate)
      slotDateTime.setHours(hour, minute, 0, 0)
      const isAvailable = !existingAppointments.some((apt) => {
        const aptStart = new Date(apt.dateTime)
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000)
        const slotEnd = new Date(slotDateTime.getTime() + 30 * 60000)
        return (
          (slotDateTime >= aptStart && slotDateTime < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotDateTime <= aptStart && slotEnd >= aptEnd)
        )
      })
      slots.push({ time, available: isAvailable })
    }
  }
  return slots
}

interface ValidationErrors {
  patient?: string
  date?: string
  time?: string
}

interface NewAppointmentModalProps {
  open: boolean
  onClose: () => void
}

export function NewAppointmentModal({ open, onClose }: NewAppointmentModalProps) {
  const [searchValue, setSearchValue] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState<string>("session")
  const [mode, setMode] = useState<"online" | "presencial">("online")
  const [duration, setDuration] = useState<"30m" | "50m" | "1h">("50m")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const { patients: allPatients } = usePatients()
  const { createAppointment, isCreating } = useAppointmentMutations()
  const { user } = useUser()

  const dateFilter = useMemo(() => {
    if (!selectedDate) return {}
    const dateStr = selectedDate.toISOString().split("T")[0]
    return { startDate: dateStr, endDate: dateStr }
  }, [selectedDate])

  const { appointments: dayAppointments } = useAppointments(dateFilter)

  const uiPatients: Patient[] = allPatients.map((p) => ({
    id: p.id, name: p.name, email: p.email || "", avatar: "",
  }))

  const timeSlots = useMemo(
    () => generateTimeSlots(selectedDate, dayAppointments as unknown as CoreAppointment[]),
    [selectedDate, dayAppointments]
  )

  const resetAndClose = () => {
    setSearchValue("")
    setSelectedPatient(null)
    setSelectedDate(new Date())
    setSelectedTime(null)
    setSessionType("session")
    setMode("online")
    setDuration("50m")
    setCurrentMonth(new Date())
    setError(null)
    setValidationErrors({})
    setSubmitted(false)
    onClose()
  }

  const validate = (): ValidationErrors => {
    const errors: ValidationErrors = {}
    if (!selectedPatient) errors.patient = "Selecione um paciente"
    if (!selectedDate) errors.date = "Selecione uma data"
    if (!selectedTime) errors.time = "Selecione um horário"
    return errors
  }

  // Clear specific validation errors when user fixes them
  React.useEffect(() => {
    if (submitted) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        if (selectedPatient) delete next.patient
        if (selectedDate) delete next.date
        if (selectedTime) delete next.time
        return next
      })
    }
  }, [selectedPatient, selectedDate, selectedTime, submitted])

  const handleConfirm = async () => {
    setSubmitted(true)
    const errors = validate()
    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) return

    setError(null)
    const [hours, minutes] = selectedTime!.split(":").map(Number)
    const appointmentDateTime = new Date(selectedDate!)
    appointmentDateTime.setHours(hours, minutes, 0, 0)
    const durationMap = { "30m": 30, "50m": 50, "1h": 60 }
    const therapistName = (user?.user_metadata?.name || user?.user_metadata?.full_name || "Terapeuta") as string
    try {
      await createAppointment({
        patientId: selectedPatient!.id,
        patientName: selectedPatient!.name,
        therapistId: user?.id || "",
        therapistName,
        dateTime: appointmentDateTime.toISOString(),
        duration: durationMap[duration],
        type: sessionType,
      })
      resetAndClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar agendamento")
    }
  }

  if (!open) return null

  const summaryDate = selectedDate
    ? selectedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "—"
  const summaryText = `${summaryDate} • ${selectedTime || "—"} • ${mode === "online" ? "Online" : "Presencial"}`

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[#161118] dark:text-white">Agendar Sessão</h1>
            <AppointmentProgressBar currentStep={2} />
          </div>
          <button onClick={resetAndClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex flex-col gap-8">
            {/* Patient Search */}
            <div>
              <PatientSearchInput
                value={searchValue}
                onChange={setSearchValue}
                onPatientSelect={(p) => setSelectedPatient(p)}
                patients={uiPatients}
              />
              {validationErrors.patient && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {validationErrors.patient}
                </p>
              )}
            </div>

            <hr className="border-[#f3f0f4] dark:border-white/5" />

            {/* Date & Time Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 flex flex-col gap-4">
                <DatePickerCalendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  currentMonth={currentMonth}
                  onPreviousMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                />
                {validationErrors.date && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {validationErrors.date}
                  </p>
                )}
              </div>
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div>
                  <TimeSlotGrid
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onTimeSelect={setSelectedTime}
                    availableSlots={timeSlots}
                  />
                  {validationErrors.time && (
                    <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {validationErrors.time}
                    </p>
                  )}
                </div>
                <AppointmentOptions
                  mode={mode}
                  duration={duration}
                  onModeChange={setMode}
                  onDurationChange={setDuration}
                />

                {/* Session Type */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Tipo de sessão</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { value: "session", label: "Sessão" },
                      { value: "evaluation", label: "Avaliação" },
                      { value: "follow_up", label: "Retorno" },
                      { value: "reevaluation", label: "Reavaliação" },
                      { value: "parent_meeting", label: "Reunião pais" },
                      { value: "report_delivery", label: "Entrega relatório" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setSessionType(t.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          sessionType === t.value
                            ? "bg-[#8A05BE] text-white border-[#8A05BE]"
                            : "bg-white border-gray-200 text-gray-600 hover:border-[#8A05BE]/30"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <button
            onClick={resetAndClose}
            className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Resumo</p>
              <p className="text-sm font-bold text-[#161118] dark:text-white">{summaryText}</p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={isCreating}
              className="px-8 py-3 rounded-xl bg-[#820AD1] text-white font-bold text-sm shadow-lg shadow-[#820AD1]/30 hover:bg-[#6D08AF] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isCreating ? "Agendando..." : "Confirmar Agendamento"}
              <span className="material-symbols-outlined text-lg">check</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
