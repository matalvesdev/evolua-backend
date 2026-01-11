"use client"

import { usePatients } from "@/hooks"

const avatarColors = [
  { bgColor: "bg-blue-100", textColor: "text-blue-600" },
  { bgColor: "bg-pink-100", textColor: "text-pink-600" },
  { bgColor: "bg-yellow-100", textColor: "text-yellow-600" },
  { bgColor: "bg-green-100", textColor: "text-green-600" },
  { bgColor: "bg-purple-100", textColor: "text-purple-600" },
]

export function RecentPatients() {
  const { patients, loading } = usePatients({ limit: 3, orderBy: 'updated_at' })

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getAvatarColor = (index: number) => {
    return avatarColors[index % avatarColors.length]
  }
  return (
    <div className="glass-panel p-6 lg:p-8 rounded-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl text-primary">
            <span className="material-symbols-outlined">group</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Pacientes Recentes</h2>
        </div>
        <button className="text-sm font-bold text-primary hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
          Ver todos <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Carregando pacientes...
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum paciente cadastrado
          </div>
        ) : (
          patients.map((patient, index) => {
            const colors = getAvatarColor(index)
            const initials = getInitials(patient.name)
            
            return (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 hover:bg-white/60 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-white/50 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full ${colors.bgColor} flex items-center justify-center ${colors.textColor} font-bold text-lg border-2 border-white shadow-sm`}>
                      {initials}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{patient.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{patient.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Atualizado</p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(patient.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-colors" title="Chat">
                    <span className="material-symbols-outlined">chat</span>
                  </button>
                  <button className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-colors" title="Prontuário">
                    <span className="material-symbols-outlined">description</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
