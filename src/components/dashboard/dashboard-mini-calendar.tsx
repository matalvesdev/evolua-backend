"use client"

import { useState, useMemo, useCallback } from "react"
import { useAppointments } from "@/hooks"
import { Portal } from "@/components/ui/portal"

const DAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatStatus(status: string): { label: string; color: string } {
  switch (status) {
    case "confirmed": return { label: "Confirmado", color: "bg-green-100 text-green-700" }
    case "scheduled": return { label: "Agendado", color: "bg-blue-100 text-blue-700" }
    case "completed": return { label: "Concluído", color: "bg-gray-100 text-gray-600" }
    case "cancelled": return { label: "Cancelado", color: "bg-red-100 text-red-600" }
    case "in_progress": return { label: "Em andamento", color: "bg-purple-100 text-purple-700" }
    default: return { label: status, color: "bg-gray-100 text-gray-600" }
  }
}

function formatType(type: string): string {
  switch (type) {
    case "regular": return "Terapia"
    case "evaluation": return "Avaliação"
    case "follow_up": return "Retorno"
    default: return "Sessão"
  }
}

export function DashboardMiniCalendar() {
  const today = useMemo(() => new Date(), [])
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Generate the 7 days of the current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  // Month/year label
  const monthLabel = useMemo(() => {
    const months = new Set(weekDays.map((d) => d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })))
    return Array.from(months).join(" — ").toUpperCase()
  }, [weekDays])

  // Fetch appointments for the whole week
  const weekFilter = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return {
      startDate: weekStart.toISOString(),
      endDate: end.toISOString(),
    }
  }, [weekStart])

  const { appointments: weekAppointments } = useAppointments(weekFilter)

  // Check which days have events
  const daysWithEvents = useMemo(() => {
    const set = new Set<string>()
    weekAppointments.forEach((apt) => {
      const d = new Date(apt.dateTime)
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    })
    return set
  }, [weekAppointments])

  const hasEvents = useCallback((date: Date) => {
    return daysWithEvents.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  }, [daysWithEvents])

  // Appointments for the selected day
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return []
    return weekAppointments
      .filter((apt) => isSameDay(new Date(apt.dateTime), selectedDate))
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  }, [selectedDate, weekAppointments])

  const goToPrevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const goToNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  return (
    <>
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{monthLabel}</span>
          <div className="flex gap-2 text-gray-400">
            <button onClick={goToPrevWeek} className="hover:text-[#8A05BE] transition-colors">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button onClick={goToNextWeek} className="hover:text-[#8A05BE] transition-colors">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const isToday = isSameDay(date, today)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const dayHasEvents = hasEvents(date)

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl cursor-pointer relative transition-all ${
                  isToday
                    ? "bg-[#8A05BE] text-white shadow-lg shadow-[rgba(138,5,190,0.25)] scale-105"
                    : isWeekend
                    ? "text-gray-400 hover:bg-white/50"
                    : "text-gray-600 hover:bg-white/50 group"
                }`}
              >
                <span className={`text-[10px] font-bold ${isToday ? "opacity-80" : "group-hover:text-[#8A05BE]"}`}>
                  {isToday ? "HOJE" : DAY_LABELS[date.getDay()]}
                </span>
                <span className={`text-sm ${isToday ? "text-lg font-bold" : isWeekend ? "font-medium" : "font-bold"}`}>
                  {date.getDate()}
                </span>
                {dayHasEvents && (
                  <span className={`w-1 h-1 rounded-full absolute ${isToday ? "bottom-1.5 bg-white" : "bottom-1 bg-[#8A05BE]"}`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Modal de compromissos do dia */}
      {selectedDate && (
        <Portal>
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#8A05BE]/10 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#8A05BE] uppercase leading-none">
                      {selectedDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                    </span>
                    <span className="text-lg font-bold text-[#8A05BE] leading-none">{selectedDate.getDate()}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedDayAppointments.length === 0
                        ? "Nenhum compromisso"
                        : `${selectedDayAppointments.length} compromisso${selectedDayAppointments.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {selectedDayAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-5xl text-gray-200 mb-3 block">event_busy</span>
                    <p className="text-gray-500 font-medium">Nenhum compromisso neste dia</p>
                    <p className="text-sm text-gray-400 mt-1">Aproveite para descansar ou organizar sua agenda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayAppointments.map((apt) => {
                      const time = new Date(apt.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      const endTime = new Date(new Date(apt.dateTime).getTime() + apt.duration * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      const status = formatStatus(apt.status)
                      const type = formatType(apt.type)

                      return (
                        <div
                          key={apt.id}
                          className="flex gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#8A05BE]/20 hover:bg-[#8A05BE]/2 transition-all"
                        >
                          {/* Time column */}
                          <div className="flex flex-col items-center shrink-0 w-14">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{time}</span>
                            <div className="w-px h-3 bg-gray-200 my-0.5" />
                            <span className="text-[10px] text-gray-400">{endTime}</span>
                          </div>

                          {/* Divider */}
                          <div className="w-1 rounded-full bg-[#8A05BE]/30 shrink-0" />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{type}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                {apt.duration}min
                              </span>
                              {apt.sessionNotes && (
                                <span className="flex items-center gap-1 truncate">
                                  <span className="material-symbols-outlined text-sm">notes</span>
                                  {apt.sessionNotes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
