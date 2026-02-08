"use client"

import { useRouter } from "next/navigation"
import { usePatients } from "@/hooks"

const avatarColors = [
  "bg-gradient-to-br from-purple-400 to-purple-600",
  "bg-gradient-to-br from-blue-400 to-blue-600",
  "bg-gradient-to-br from-green-400 to-green-600",
  "bg-gradient-to-br from-orange-400 to-orange-600",
  "bg-gradient-to-br from-pink-400 to-pink-600",
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function RecentPatients() {
  const router = useRouter()
  const { patients, loading } = usePatients({ limit: 5, status: "active" })

  return (
    <div className="glass-panel p-6 lg:p-8 rounded-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#8A05BE]/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#8A05BE]/10 rounded-xl text-[#8A05BE]">
            <span className="material-symbols-outlined">group</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Pacientes Recentes</h2>
        </div>
        <button
          onClick={() => router.push("/dashboard/pacientes")}
          className="text-sm font-bold text-[#8A05BE] hover:bg-[#8A05BE]/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          Ver todos <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined animate-spin text-2xl mb-2 block">progress_activity</span>
            <p className="text-sm">Carregando pacientes...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">group_off</span>
            <p className="text-sm mb-3">Nenhum paciente cadastrado</p>
            <button
              onClick={() => router.push("/dashboard/pacientes/novo")}
              className="text-sm font-bold text-[#8A05BE] hover:bg-[#8A05BE]/5 px-4 py-2 rounded-lg transition-colors"
            >
              Cadastrar primeiro paciente
            </button>
          </div>
        ) : (
          patients.map((patient, index) => (
            <div
              key={patient.id}
              onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)}
              className="flex items-center justify-between p-3 hover:bg-white/60 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-white/50 hover:shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-sm`}>
                    {getInitials(patient.name)}
                  </div>
                  {patient.status === "active" && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 group-hover:text-[#8A05BE] transition-colors">{patient.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{patient.phone || patient.email || "Sem contato"}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/pacientes/${patient.id}`) }}
                  className="p-2 text-gray-400 hover:text-[#8A05BE] hover:bg-white rounded-lg transition-colors"
                  title="Prontuário"
                >
                  <span className="material-symbols-outlined">description</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
