"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTodayAppointments, useTasks } from "@/hooks"
import { usePendingReports } from "@/hooks"

interface Notification {
  id: string
  type: "appointment" | "report" | "reminder"
  title: string
  description: string
  time: string
  read: boolean
  href?: string
  icon: string
  iconBg: string
}

export function useNotifications() {
  const { appointments } = useTodayAppointments()
  const { reports } = usePendingReports()
  const { tasks } = useTasks({ type: "reminder", status: "pending" })

  const notifications: Notification[] = []

  // Upcoming appointments (within 60 min)
  const now = new Date()
  appointments
    .filter(a => a.status === "scheduled" || a.status === "confirmed")
    .forEach(a => {
      const apptTime = new Date(a.dateTime)
      const diffMin = (apptTime.getTime() - now.getTime()) / 60000
      if (diffMin > 0 && diffMin <= 60) {
        notifications.push({
          id: `appt-${a.id}`,
          type: "appointment",
          title: "Consulta em breve",
          description: `Sessão às ${apptTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          time: `em ${Math.round(diffMin)} min`,
          read: false,
          href: "/dashboard/agendamentos",
          icon: "event",
          iconBg: "bg-blue-100 text-blue-600",
        })
      }
    })

  // Pending reports
  reports.slice(0, 3).forEach(r => {
    notifications.push({
      id: `report-${r.id}`,
      type: "report",
      title: "Relatório pendente",
      description: r.title,
      time: new Date(r.createdAt).toLocaleDateString("pt-BR"),
      read: false,
      href: "/dashboard/relatorios",
      icon: "description",
      iconBg: "bg-orange-100 text-orange-600",
    })
  })

  // Overdue reminders
  tasks
    .filter(t => t.dueDate && new Date(t.dueDate) < now)
    .slice(0, 3)
    .forEach(t => {
      notifications.push({
        id: `task-${t.id}`,
        type: "reminder",
        title: "Lembrete vencido",
        description: t.title,
        time: t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "",
        read: false,
        href: "/dashboard/tarefas",
        icon: "alarm",
        iconBg: "bg-red-100 text-red-600",
      })
    })

  return { notifications, unreadCount: notifications.length }
}

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter()
  const { notifications } = useNotifications()
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleClick = (n: Notification) => {
    setReadIds(prev => new Set(prev).add(n.id))
    if (n.href) router.push(n.href)
    onClose()
  }

  const markAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)))
  }

  const unreadNotifications = notifications.filter(n => !readIds.has(n.id))

  return (
    <div ref={panelRef} className="absolute top-full right-0 mt-2 w-80 sm:w-96 glass-card rounded-2xl shadow-2xl border border-white/60 overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm">Notificações</h3>
        {unreadNotifications.length > 0 && (
          <button onClick={markAllRead} className="text-xs font-medium text-[#8A05BE] hover:underline">
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-3xl text-gray-300 mb-2 block">notifications_off</span>
            <p className="text-sm text-gray-400">Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/60 transition-colors border-b border-gray-50 last:border-0 ${readIds.has(n.id) ? "opacity-60" : ""}`}
            >
              <div className={`p-2 rounded-xl ${n.iconBg} shrink-0`}>
                <span className="material-symbols-outlined text-lg">{n.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{n.title}</p>
                <p className="text-xs text-gray-500 truncate">{n.description}</p>
                <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
              </div>
              {!readIds.has(n.id) && (
                <div className="w-2 h-2 rounded-full bg-[#8A05BE] mt-2 shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
