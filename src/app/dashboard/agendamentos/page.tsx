"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppointments, useTodayAppointments, useWeekAppointments, useAppointmentMutations } from "@/hooks"
import type { Appointment } from "@/lib/api/appointments"

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: string }> = {
  scheduled: { label: "Agendado", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500", icon: "schedule" },
  confirmed: { label: "Confirmado", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", icon: "check_circle" },
  "in-progress": { label: "Em Andamento", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", icon: "play_circle" },
  completed: { label: "Concluído", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", icon: "task_alt" },
  cancelled: { label: "Cancelado", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400", icon: "cancel" },
  "no-show": { label: "Faltou", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", icon: "person_off" },
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
}

function formatTime(dateTime: string) {
  return new Date(dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatEndTime(dateTime: string, durationMin: number) {
  const end = new Date(new Date(dateTime).getTime() + durationMin * 60000)
  return end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function formatSelectedDate(date: Date) {
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" })
  const day = date.getDate()
  const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${String(day).padStart(2, "0")} ${month.charAt(0).toUpperCase() + month.slice(1)}`
}

interface CalendarDay {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  date: Date
  appointmentCount: number
}

function generateCalendarDays(year: number, month: number, appointments: Appointment[]): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const days: CalendarDay[] = []

  // Previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, isToday: false, date: new Date(year, month - 1, prevMonthLastDay - i), appointmentCount: 0 })
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const count = appointments.filter((a) => isSameDay(new Date(a.dateTime), date)).length
    days.push({ day, isCurrentMonth: true, isToday: isCurrentMonth && today.getDate() === day, date, appointmentCount: count })
  }

  // Next month to fill grid
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, isToday: false, date: new Date(year, month + 1, i), appointmentCount: 0 })
  }

  return days
}

export default function AgendamentosPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState("")

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long" })

  // Fetch month appointments
  const monthStart = new Date(year, month, 1).toISOString()
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  const { appointments: monthAppointments, loading: monthLoading } = useAppointments({ startDate: monthStart, endDate: monthEnd, limit: 200 })

  // Today stats
  const { appointments: todayAppointments } = useTodayAppointments()
  const { appointments: weekAppointments } = useWeekAppointments()

  const { confirmAppointment, startAppointment, cancelAppointment, completeAppointment } = useAppointmentMutations()

  const calendarDays = useMemo(() => generateCalendarDays(year, month, monthAppointments), [year, month, monthAppointments])

  // Appointments for selected day (with status filter)
  const selectedDayAppointments = useMemo(
    () => monthAppointments
      .filter((a) => isSameDay(new Date(a.dateTime), selectedDate))
      .filter((a) => !statusFilter || a.status === statusFilter)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [monthAppointments, selectedDate, statusFilter]
  )

  // Counts for filter badges
  const selectedDayAll = useMemo(
    () => monthAppointments.filter((a) => isSameDay(new Date(a.dateTime), selectedDate)),
    [monthAppointments, selectedDate]
  )

  const todayCount = todayAppointments.length
  const weekCount = weekAppointments.length

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const handleToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()) }

  const handleDayClick = (date: Date) => setSelectedDate(date)

  const handleAction = async (action: string, apt: Appointment) => {
    try {
      if (action === "confirm") await confirmAppointment(apt.id)
      if (action === "start") await startAppointment(apt.id)
      if (action === "complete") await completeAppointment({ id: apt.id })
      if (action === "cancel") await cancelAppointment({ id: apt.id, reason: "Cancelado pelo profissional", cancelledBy: "therapist" })
    } catch { /* handled by mutation */ }
  }

  const STATUS_FILTERS = [
    { key: "", label: "Todos", icon: "event_note", count: selectedDayAll.length },
    { key: "scheduled", label: "Agendados", dot: "bg-yellow-500", count: selectedDayAll.filter((a) => a.status === "scheduled").length },
    { key: "confirmed", label: "Confirmados", dot: "bg-blue-500", count: selectedDayAll.filter((a) => a.status === "confirmed").length },
    { key: "completed", label: "Concluídos", dot: "bg-green-500", count: selectedDayAll.filter((a) => a.status === "completed").length },
    { key: "cancelled", label: "Cancelados", dot: "bg-red-400", count: selectedDayAll.filter((a) => a.status === "cancelled").length },
  ]

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-6">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 flex flex-col gap-5 sm:gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Agenda</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Gerencie seus atendimentos e horários.</p>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1.5 bg-[#820AD1]/5 text-[#820AD1] font-bold px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[16px]">today</span>
              {todayCount} hoje
            </span>
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[16px]">date_range</span>
              {weekCount} semana
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                statusFilter === f.key
                  ? "bg-[#820AD1] text-white shadow-md shadow-purple-200"
                  : "bg-white/70 text-gray-600 hover:bg-gray-50 border border-gray-100"
              }`}
            >
              {f.dot ? (
                <span className={`w-2 h-2 rounded-full ${statusFilter === f.key ? "bg-white" : f.dot}`} />
              ) : (
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{f.icon}</span>
              )}
              {f.label}
              {f.count > 0 && (
                <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  statusFilter === f.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main Grid: Calendar + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

          {/* Calendar */}
          <div className="lg:col-span-8 xl:col-span-8">
            <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 capitalize">{monthName} {year}</h2>
                  <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
                    <button onClick={handlePrevMonth} className="p-1.5 rounded-full hover:bg-white hover:shadow-sm transition-all">
                      <span className="material-symbols-outlined text-gray-600 text-[18px]">chevron_left</span>
                    </button>
                    <button onClick={handleNextMonth} className="p-1.5 rounded-full hover:bg-white hover:shadow-sm transition-all">
                      <span className="material-symbols-outlined text-gray-600 text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
                <button onClick={handleToday} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#820AD1] bg-[#820AD1]/10 hover:bg-[#820AD1]/15 rounded-lg transition-colors">
                  Hoje
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-1 sm:mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest text-center py-1.5">{d}</div>
                ))}
              </div>

              {/* Days Grid */}
              {monthLoading ? (
                <div className="flex items-center justify-center py-20">
                  <span className="material-symbols-outlined animate-spin text-[#820AD1] text-2xl">progress_activity</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {calendarDays.map((d, i) => {
                    const isSelected = isSameDay(d.date, selectedDate) && d.isCurrentMonth
                    return (
                      <button
                        key={i}
                        onClick={() => d.isCurrentMonth && handleDayClick(d.date)}
                        disabled={!d.isCurrentMonth}
                        className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-xl transition-all ${
                          !d.isCurrentMonth
                            ? "text-gray-300 cursor-default"
                            : isSelected
                              ? "bg-[#820AD1] text-white shadow-lg shadow-[#820AD1]/20"
                              : d.isToday
                                ? "bg-[#820AD1]/10 text-[#820AD1] font-bold ring-1.5 ring-[#820AD1]/25 hover:bg-[#820AD1]/15"
                                : "text-gray-700 hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <span className={`text-xs sm:text-sm font-semibold ${isSelected ? "text-white" : ""}`}>{d.day}</span>
                        {d.appointmentCount > 0 && d.isCurrentMonth && (
                          <div className="flex gap-0.5 mt-0.5">
                            {Array.from({ length: Math.min(d.appointmentCount, 3) }).map((_, j) => (
                              <span key={j} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-[#820AD1]"}`} />
                            ))}
                            {d.appointmentCount > 3 && (
                              <span className={`text-[8px] font-bold leading-none ${isSelected ? "text-white/80" : "text-[#820AD1]"}`}>+</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Selected Day Appointments */}
          <div className="lg:col-span-4 xl:col-span-4">
            <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:sticky lg:top-6">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    Atendimentos
                    {selectedDayAppointments.length > 0 && (
                      <span className="ml-2 text-xs font-bold text-gray-400">({selectedDayAppointments.length})</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{formatSelectedDate(selectedDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusFilter && (
                    <button onClick={() => setStatusFilter("")} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-0.5 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                      Limpar
                    </button>
                  )}
                  {isSameDay(selectedDate, new Date()) && (
                    <span className="px-2 py-0.5 bg-[#820AD1]/10 text-[#820AD1] text-[10px] font-bold rounded-full">HOJE</span>
                  )}
                </div>
              </div>

              {/* Appointments List */}
              <div className="flex flex-col gap-2.5 sm:gap-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1 -mr-1">
                {selectedDayAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-3xl text-gray-300">event_available</span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Nenhum atendimento</p>
                    <p className="text-xs text-gray-400 mb-4">Dia livre para este dia.</p>
                    <Link href="/dashboard/agendamentos/novo">
                      <button className="text-xs font-bold text-[#820AD1] bg-[#820AD1]/10 hover:bg-[#820AD1]/15 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Agendar
                      </button>
                    </Link>
                  </div>
                ) : (
                  selectedDayAppointments.map((apt) => {
                    const sc = getStatusConfig(apt.status)
                    return (
                      <div
                        key={apt.id}
                        onClick={() => router.push(`/dashboard/agendamentos/${apt.id}`)}
                        className="glass-card-item rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer group hover:shadow-md hover:border-[#820AD1]/10 transition-all"
                      >
                        {/* Time + Status */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#820AD1] text-[16px]">schedule</span>
                            <span className="text-xs sm:text-sm font-bold text-gray-900">
                              {formatTime(apt.dateTime)} - {formatEndTime(apt.dateTime, apt.duration)}
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${sc.bg} ${sc.text} text-[10px] font-bold rounded-full`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>

                        {/* Patient */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#820AD1] to-[#C084FC] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(apt.patientName || "P").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#820AD1] transition-colors">
                              {apt.patientName || "Paciente"}
                            </p>
                            <p className="text-[11px] text-gray-400">{apt.duration} min · {formatType(apt.type)}</p>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        {["scheduled", "confirmed", "in-progress"].includes(apt.status) && (
                          <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                            {apt.status === "scheduled" && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleAction("confirm", apt) }} className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                                  Confirmar
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleAction("cancel", apt) }} className="text-[11px] font-bold py-1.5 px-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                                  Cancelar
                                </button>
                              </>
                            )}
                            {apt.status === "confirmed" && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleAction("start", apt) }} className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-[#820AD1] text-white hover:bg-[#6D08AF] transition-colors shadow-sm shadow-[#820AD1]/20">
                                  Iniciar Sessão
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleAction("cancel", apt) }} className="text-[11px] font-bold py-1.5 px-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                                  Cancelar
                                </button>
                              </>
                            )}
                            {apt.status === "in-progress" && (
                              <button onClick={(e) => { e.stopPropagation(); handleAction("complete", apt) }} className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                                Finalizar Sessão
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}

                {/* Add appointment button */}
                {selectedDayAppointments.length > 0 && (
                  <Link href="/dashboard/agendamentos/novo" className="block">
                    <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-[#820AD1] hover:border-[#820AD1]/30 hover:bg-[#820AD1]/5 transition-all text-xs font-bold">
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      Adicionar Horário
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatType(type: string): string {
  const types: Record<string, string> = {
    regular: "Sessão Regular",
    evaluation: "Avaliação",
    reevaluation: "Reavaliação",
    discharge: "Alta",
  }
  return types[type] ?? type
}
