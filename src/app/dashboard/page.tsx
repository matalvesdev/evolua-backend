"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { ScheduleCard } from "@/components/dashboard/schedule-card"
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar"
import type { ModalType } from "@/components/dashboard/quick-actions-bar"
import { DashboardMiniCalendar } from "@/components/dashboard/dashboard-mini-calendar"
import { RecentPatients } from "@/components/dashboard/recent-patients"
import { RemindersPanel } from "@/components/dashboard/reminders-panel"
import { DashboardTodoList } from "@/components/dashboard/dashboard-todo-list"
import { useTodayAppointments } from "@/hooks"

export default function DashboardPage() {
  const { appointments, loading } = useTodayAppointments()
  const [externalModal, setExternalModal] = useState<ModalType>(null)

  return (
    <>
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth pb-24">
        <WelcomeSection />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main column (2/3) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            {/* Schedule */}
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8A05BE]">event_available</span>
                  Sua Agenda de Hoje
                </h3>
                {!loading && appointments.length > 0 && (
                  <span className="text-xs font-bold text-[#8A05BE] bg-[#8A05BE]/5 px-3 py-1 rounded-full">
                    {appointments.filter(a => a.status === "scheduled" || a.status === "confirmed").length} consultas pendentes
                  </span>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {loading ? (
                  <div className="col-span-2 text-center py-8 text-gray-500">Carregando agendamentos...</div>
                ) : appointments.length === 0 ? (
                  <div className="col-span-2 glass-card-item rounded-2xl p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">event_busy</span>
                    <p className="text-gray-500 font-medium">Nenhum agendamento para hoje</p>
                    <p className="text-sm text-gray-400 mt-1">Aproveite para organizar sua agenda</p>
                  </div>
                ) : (
                  appointments.slice(0, 2).map((appointment) => (
                    <ScheduleCard
                      key={appointment.id}
                      time={new Date(appointment.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      duration={`${appointment.duration}min`}
                      patientName={"Paciente"}
                      sessionType={appointment.type === "regular" ? "Terapia" : appointment.type === "evaluation" ? "Avaliação" : "Sessão"}
                      sessionTypeColor={appointment.type === "regular" ? "bg-green-500" : "bg-orange-400"}
                      badge={appointment.status === "confirmed" ? "Confirmado" : appointment.status === "scheduled" ? "Agendado" : "Em andamento"}
                      badgeColor={appointment.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-[#8A05BE]/10 text-[#8A05BE]"}
                      location="Presencial"
                      locationIcon="location_on"
                      locationColor="text-gray-600"
                      isPrimary={new Date(appointment.dateTime).getHours() === new Date().getHours()}
                    />
                  ))
                )}
              </div>
            </div>

            <QuickActionsBar externalModal={externalModal} onCloseExternal={() => setExternalModal(null)} />
            <DashboardMiniCalendar />
            <RecentPatients />
          </div>

          {/* Sidebar column (1/3) */}
          <div className="xl:col-span-1 flex flex-col h-full">
            <div className="glass-panel p-6 rounded-3xl flex-1 flex flex-col relative overflow-hidden border border-white/60">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100/30 rounded-bl-full -z-10"></div>

              <RemindersPanel
                onOpenAppointmentModal={() => setExternalModal("appointment")}
                onOpenReportModal={() => setExternalModal("report")}
              />

              <div className="h-px bg-gray-200/50 w-full mb-6"></div>

              <DashboardTodoList />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
