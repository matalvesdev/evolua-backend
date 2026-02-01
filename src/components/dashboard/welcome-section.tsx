"use client"

import { useUser } from "@/hooks"
import { useTodayAppointments } from "@/hooks"

export function WelcomeSection() {
  const { user } = useUser()
  const { appointments } = useTodayAppointments()
  
  const pendingSessions = appointments.filter(
    a => a.status === 'scheduled' || a.status === 'confirmed'
  ).length

  const userName = user?.name ? user.name.split(' ')[0] : 'Profissional'

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            Olá, {userName}! <span className="text-2xl">👋</span>
          </h1>
          <p className="text-lg text-gray-600">
            {pendingSessions > 0 
              ? `Sua agenda de hoje espera por você` 
              : `Você está em dia com seus agendamentos`
            } <span className="text-primary font-bold">💜</span>
          </p>
        </div>
        {pendingSessions > 0 && (
          <div className="glass-panel px-5 py-3 rounded-full flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-default bg-white/80">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-purple-200 border border-white flex items-center justify-center text-[10px] text-purple-700 font-bold">
                {pendingSessions}
              </div>
            </div>
            <span className="text-sm font-medium text-gray-600">
              <strong>{pendingSessions} {pendingSessions === 1 ? 'sessão' : 'sessões'}</strong> pendente{pendingSessions !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
