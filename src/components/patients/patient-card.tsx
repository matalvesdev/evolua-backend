"use client"

import Link from "next/link"
import { getInitials, getAvatarColor, getSpecialtyColor } from "./patient-utils"

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
        {/* Patient info: avatar initial + name + age + guardian */}
        <div className="col-span-4 flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div
              className={`w-11 h-11 rounded-full bg-linear-to-br ${getAvatarColor(name)} flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm`}
            >
              {getInitials(name)}
            </div>
            {/* Status indicator dot */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${
                status === "active" ? "bg-green-500" : "bg-gray-400"
              } border-2 border-white rounded-full`}
              title={status === "active" ? "Ativo" : "Inativo"}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-[#8A05BE] transition-colors truncate">
              {name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              {age !== undefined && <span>{age} anos</span>}
              {age !== undefined && guardian && (
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
              )}
              {guardian && <span className="truncate">Resp: {guardian}</span>}
            </div>
          </div>
        </div>

        {/* Specialty tags */}
        <div className="col-span-3">
          <div className="flex flex-wrap gap-1.5">
            {specialties.map((specialty, index) => (
              <span
                key={index}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${getSpecialtyColor(specialty)}`}
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>

        {/* Sessions */}
        <div className="col-span-3 text-sm">
          <div className="flex flex-col gap-1">
            {lastSession && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="material-symbols-outlined text-sm text-gray-400">history</span>
                <span className="text-xs">Última: {formatDate(lastSession)}</span>
              </div>
            )}
            {nextSession ? (
              <div
                className={`flex items-center gap-1.5 ${
                  isToday(nextSession) ? "text-[#8A05BE] font-bold" : "text-gray-500"
                }`}
              >
                <span className="material-symbols-outlined text-sm">event</span>
                <span className="text-xs">
                  Próxima: {isToday(nextSession) ? "Hoje" : formatDate(nextSession)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400 italic">
                <span className="material-symbols-outlined text-sm">event_busy</span>
                <span className="text-xs">Sem agendamento</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2 flex justify-end items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/dashboard/pacientes/${id}`}>
            <button
              className="p-2 rounded-xl hover:bg-[#8A05BE] hover:text-white text-gray-400 transition-colors"
              title="Ver Perfil"
            >
              <span className="material-symbols-outlined text-xl">visibility</span>
            </button>
          </Link>
          <button className="p-2 rounded-xl hover:bg-purple-50 text-gray-400 hover:text-[#8A05BE] transition-colors">
            <span className="material-symbols-outlined text-xl">more_horiz</span>
          </button>
        </div>
      </div>
    </div>
  )
}
