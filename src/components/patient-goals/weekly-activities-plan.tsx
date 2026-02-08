"use client"

import { ActivityChecklistItem } from "./activity-checklist-item"

interface Activity {
  id: string
  title: string
  description: string
  location: "home" | "office" | "completed"
  duration?: string
  completed?: boolean
}

interface WeeklyActivitiesPlanProps {
  activities: Activity[]
  onAddActivity?: () => void
  onActivityToggle?: (activityId: string, checked: boolean) => void
}

export function WeeklyActivitiesPlan({
  activities,
  onAddActivity,
  onActivityToggle,
}: WeeklyActivitiesPlanProps) {
  return (
    <section className="glass-card rounded-[2rem] p-6 md:p-8 border border-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-[#8A05BE]/10 p-2 rounded-xl text-[#8A05BE] mt-1">
            <span className="material-symbols-outlined text-[24px]">assignment</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Plano de Atividades da Semana</h3>
            <p className="text-sm text-gray-600 mt-1 max-w-lg">
              Exercícios sugeridos para realização em consultório e casa para reforçar o aprendizado.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="text-xs font-bold text-[#8A05BE] bg-[#8A05BE]/5 border border-[#8A05BE]/10 px-5 py-2.5 rounded-xl hover:bg-[#8A05BE]/10 transition-colors">
            Ver Histórico
          </button>
          <button className="text-xs font-bold text-gray-600 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">share</span>
            Enviar p/ Pais
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {activities.map((activity) => (
          <ActivityChecklistItem
            key={activity.id}
            title={activity.title}
            description={activity.description}
            location={activity.location}
            duration={activity.duration}
            defaultChecked={activity.completed}
            onToggle={(checked) => onActivityToggle?.(activity.id, checked)}
          />
        ))}
      </div>

      <button
        onClick={onAddActivity}
        className="w-full mt-6 py-4 border-2 border-dashed border-[#8A05BE]/20 rounded-2xl text-[#8A05BE] text-sm font-bold hover:bg-[#8A05BE]/5 hover:border-[#8A05BE]/40 transition-all flex items-center justify-center gap-2 group"
      >
        <span className="bg-[#8A05BE]/10 p-1 rounded-lg group-hover:bg-[#8A05BE]/20 transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
        </span>
        Adicionar Nova Atividade
      </button>
    </section>
  )
}
