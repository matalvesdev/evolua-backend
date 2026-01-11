"use client"

import Link from "next/link"

interface PatientCardProps {
  id: string
  name: string
  age?: number
  guardian?: string
  specialties: string[]
  lastSession?: string
  nextSession?: string
  status: "active" | "inactive"
}

export function PatientCard({
  id,
  name,
  age,
  guardian,
  specialties,
  lastSession,
  nextSession,
  status,
}: PatientCardProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-100 to-blue-200 text-blue-600",
      "from-pink-100 to-rose-200 text-rose-600",
      "from-amber-100 to-yellow-200 text-amber-600",
      "from-indigo-100 to-indigo-200 text-indigo-600",
      "from-teal-100 to-teal-200 text-teal-600",
      "from-purple-100 to-purple-200 text-purple-600",
      "from-emerald-100 to-emerald-200 text-emerald-600",
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const getSpecialtyColor = (specialty: string) => {
    const lowerSpecialty = specialty.toLowerCase()
    if (lowerSpecialty.includes("tea")) return "bg-purple-100 text-primary"
    if (lowerSpecialty.includes("fala")) return "bg-gray-100 text-gray-600"
    if (lowerSpecialty.includes("motricidade")) return "bg-orange-100 text-orange-700"
    if (lowerSpecialty.includes("apraxia")) return "bg-blue-100 text-blue-700"
    if (lowerSpecialty.includes("linguagem")) return "bg-emerald-100 text-emerald-700"
    if (lowerSpecialty.includes("disfagia")) return "bg-red-100 text-red-600"
    return "bg-gray-100 text-gray-600"
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  }

  const isToday = (dateString?: string) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="glass-card-item rounded-2xl p-4 group cursor-pointer">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Paciente */}
        <div className="col-span-4 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm`}>
              {getInitials(name)}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 ${status === "active" ? "bg-green-500" : "bg-gray-400"} border-2 border-white rounded-full`}
              title={status === "active" ? "Ativo" : "Inativo"}
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-primary transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {age && <span>{age} anos</span>}
              {age && guardian && <span className="w-1 h-1 bg-gray-300 rounded-full" />}
              {guardian && <span>Resp: {guardian}</span>}
            </div>
          </div>
        </div>

        {/* Especialidade/Foco */}
        <div className="col-span-3">
          <div className="flex flex-wrap gap-2">
            {specialties.map((specialty, index) => (
              <span
                key={index}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getSpecialtyColor(specialty)}`}
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>

        {/* Sessões */}
        <div className="col-span-3 text-sm">
          <div className="flex flex-col gap-1">
            {lastSession && (
              <div className="flex items-center gap-2 text-gray-700">
                <span className="material-symbols-outlined text-base text-gray-400">history</span>
                <span className="text-xs">Última: {formatDate(lastSession)}</span>
              </div>
            )}
            {nextSession ? (
              <div className={`flex items-center gap-2 ${isToday(nextSession) ? "text-primary font-bold" : "text-gray-500"}`}>
                <span className="material-symbols-outlined text-base">event</span>
                <span className="text-xs">
                  Próxima: {isToday(nextSession) ? "Hoje" : formatDate(nextSession)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 italic">
                <span className="material-symbols-outlined text-base">event_busy</span>
                <span className="text-xs">Sem agendamento</span>
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="col-span-2 flex justify-end items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/dashboard/pacientes/${id}`}>
            <button
              className="p-2 rounded-xl hover:bg-primary hover:text-white text-gray-400 transition-colors"
              title="Ver Perfil"
            >
              <span className="material-symbols-outlined">visibility</span>
            </button>
          </Link>
          <button className="p-2 rounded-xl hover:bg-purple-100 text-gray-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
      </div>
    </div>
  )
}
