"use client"

import { useState } from "react"

interface CalendarDay {
  day: string
  date: number
  isToday?: boolean
  hasEvents?: boolean
  isWeekend?: boolean
}

const calendarDays: CalendarDay[] = [
  { day: "DOM", date: 20, isWeekend: true },
  { day: "SEG", date: 21, hasEvents: false },
  { day: "TER", date: 22, hasEvents: true },
  { day: "QUA", date: 23, hasEvents: true },
  { day: "HOJE", date: 24, isToday: true, hasEvents: true },
  { day: "SEX", date: 25, hasEvents: true },
  { day: "SÁB", date: 26, isWeekend: true },
]

export function DashboardMiniCalendar() {
  const [currentMonth] = useState("Outubro 2023")

  return (
    <div className="glass-panel p-4 rounded-2xl">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{currentMonth}</span>
        <div className="flex gap-2 text-gray-400">
          <button className="hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <button className="hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`flex flex-col items-center gap-1 py-2 rounded-xl cursor-pointer relative transition-colors ${
              day.isToday
                ? "bg-primary text-white shadow-lg shadow-purple-200 transform scale-105"
                : day.isWeekend
                ? "text-gray-400 hover:bg-white/50"
                : "text-gray-600 hover:bg-white/50 group"
            }`}
          >
            <span className={`text-[10px] font-bold ${day.isToday ? "opacity-80" : "group-hover:text-primary"}`}>
              {day.day}
            </span>
            <span className={`text-sm ${day.isToday ? "text-lg font-bold" : day.isWeekend ? "font-medium" : "font-bold"}`}>
              {day.date}
            </span>
            {day.hasEvents && (
              <span className={`w-1 h-1 rounded-full absolute ${day.isToday ? "bottom-1.5 bg-white" : "bottom-1 bg-primary"}`}></span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
