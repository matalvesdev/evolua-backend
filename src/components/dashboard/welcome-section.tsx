"use client"

import { useUser } from "@/hooks"
import { useTodayAppointments } from "@/hooks"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function getMotivationalPhrase(pending: number) {
  if (pending === 0) {
    const phrases = [
      "Sua agenda está livre. Aproveite para organizar seus relatórios!",
      "Nenhuma sessão pendente. Que tal revisar seus pacientes?",
      "Tudo em dia por aqui. Continue com o ótimo trabalho!",
    ]
    return phrases[new Date().getDate() % phrases.length]
  }
  if (pending === 1) return "Você tem 1 sessão hoje. Vamos lá!"
  return `Você tem ${pending} sessões hoje. Bora fazer acontecer!`
}

export function WelcomeSection() {
  const { user } = useUser()
  const { appointments } = useTodayAppointments()

  const pendingSessions = appointments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed"
  ).length

  const userName = (
    user?.user_metadata?.name
      ? user.user_metadata.name.split(" ")[0]
      : user?.user_metadata?.full_name
        ? user.user_metadata.full_name.split(" ")[0]
        : "Profissional"
  ) as string

  const today = new Date()
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const greeting = getGreeting()
  const phrase = getMotivationalPhrase(pendingSessions)

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 capitalize mb-1">{formattedDate}</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {greeting}, {userName}!
          </h1>
          <p className="text-sm text-gray-500 mt-2">{phrase}</p>
        </div>

        {pendingSessions > 0 && (
          <div className="glass-panel px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-default bg-white/80">
            <div className="p-2 rounded-xl bg-[#8A05BE]/10">
              <span className="material-symbols-outlined text-[#8A05BE] text-lg">event_available</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {pendingSessions} {pendingSessions === 1 ? "sessão" : "sessões"}
              </p>
              <p className="text-[11px] text-gray-500">pendente{pendingSessions !== 1 ? "s" : ""} hoje</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
