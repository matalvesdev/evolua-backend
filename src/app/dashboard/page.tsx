import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { ScheduleCard } from "@/components/dashboard/schedule-card"
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar"
import { DashboardMiniCalendar } from "@/components/dashboard/dashboard-mini-calendar"
import { RecentPatients } from "@/components/dashboard/recent-patients"
import { RemindersPanel } from "@/components/dashboard/reminders-panel"
import { DashboardTodoList } from "@/components/dashboard/dashboard-todo-list"
import { FloatingActionButton } from "@/components/dashboard/floating-action-button"

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth pb-24">
        <WelcomeSection />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Coluna principal (2/3) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            {/* Agenda */}
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">event_available</span>
                  Sua Agenda de Hoje
                </h3>
                <span className="text-xs font-bold text-primary bg-purple-50 px-3 py-1 rounded-full">
                  2 consultas restantes
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <ScheduleCard
                  time="14:00"
                  duration="45min"
                  patientName="Miguel Garcia"
                  sessionType="Terapia de Fala"
                  sessionTypeColor="bg-green-500"
                  badge="Em 15min"
                  badgeColor="bg-purple-100 text-primary"
                  location="Videochamada"
                  locationIcon="videocam"
                  locationColor="text-blue-500"
                  isPrimary
                />
                <ScheduleCard
                  time="16:30"
                  duration="30min"
                  patientName="Laura Almeida"
                  sessionType="Avaliação"
                  sessionTypeColor="bg-orange-400"
                  badge="Confirmado"
                  badgeColor="bg-gray-100 text-gray-500"
                  location="Presencial"
                  locationIcon="location_on"
                  locationColor="text-gray-600"
                />
              </div>
            </div>

            {/* Ações rápidas */}
            <QuickActionsBar />

            {/* Calendário mini */}
            <DashboardMiniCalendar />

            {/* Pacientes recentes */}
            <RecentPatients />
          </div>

          {/* Coluna lateral (1/3) */}
          <div className="xl:col-span-1 flex flex-col h-full">
            <div className="glass-panel p-6 rounded-3xl flex-1 flex flex-col relative overflow-hidden border border-white/60">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100/30 rounded-bl-full -z-10"></div>
              
              <RemindersPanel />
              
              <div className="h-px bg-gray-200/50 w-full mb-6"></div>
              
              <DashboardTodoList />
            </div>
          </div>
        </div>
      </main>

      <FloatingActionButton />
    </>
  )
}
