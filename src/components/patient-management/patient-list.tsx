"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export interface PatientListItem {
  id: string
  name: string
  birthDate?: string
  cpf?: string
  phone?: string
  email?: string
  status: "new" | "active" | "on_hold" | "discharged" | "inactive"
  lastAppointment?: string
  nextAppointment?: string
}

interface PatientListProps {
  patients: PatientListItem[]
  isLoading?: boolean
  onPatientClick?: (patientId: string) => void
  emptyMessage?: string
}

export function PatientList({
  patients,
  isLoading = false,
  onPatientClick,
  emptyMessage = "Nenhum paciente encontrado"
}: PatientListProps) {
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

  const getStatusBadge = (status: PatientListItem["status"]) => {
    const statusConfig = {
      new: { label: "Novo", color: "bg-blue-100 text-blue-700" },
      active: { label: "Ativo", color: "bg-green-100 text-green-700" },
      on_hold: { label: "Em Espera", color: "bg-yellow-100 text-yellow-700" },
      discharged: { label: "Alta", color: "bg-gray-100 text-gray-700" },
      inactive: { label: "Inativo", color: "bg-red-100 text-red-700" }
    }

    const config = statusConfig[status]
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const calculateAge = (birthDateStr: string) => {
    const today = new Date()
    const birth = new Date(birthDateStr)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card-item rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
          person_search
        </span>
        <p className="text-gray-600 text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* List Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200/50">
        <div className="col-span-4">Paciente</div>
        <div className="col-span-2">Contato</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-3">Agendamentos</div>
        <div className="col-span-1 text-right">Ações</div>
      </div>

      {/* Patient List */}
      {patients.map((patient) => (
        <div
          key={patient.id}
          className="glass-card-item rounded-2xl p-4 group cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onPatientClick?.(patient.id)}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Patient Info */}
            <div className="col-span-4 flex items-center gap-4">
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-full bg-linear-to-br ${getAvatarColor(patient.name)} flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm`}>
                  {getInitials(patient.name)}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 ${
                    patient.status === "active" ? "bg-green-500" : "bg-gray-400"
                  } border-2 border-white rounded-full`}
                  title={patient.status === "active" ? "Ativo" : "Inativo"}
                />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-primary transition-colors">
                  {patient.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {patient.birthDate ? `${calculateAge(patient.birthDate)} anos` : ""}
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span>CPF: {patient.cpf}</span>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="col-span-2 text-sm">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="material-symbols-outlined text-base text-gray-400">phone</span>
                  <span>{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="material-symbols-outlined text-base text-gray-400">email</span>
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="col-span-2">
              {getStatusBadge(patient.status)}
            </div>

            {/* Appointments */}
            <div className="col-span-3 text-sm">
              <div className="flex flex-col gap-1">
                {patient.lastAppointment && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="material-symbols-outlined text-base text-gray-400">history</span>
                    <span className="text-xs">Última: {formatDate(patient.lastAppointment)}</span>
                  </div>
                )}
                {patient.nextAppointment ? (
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <span className="material-symbols-outlined text-base">event</span>
                    <span className="text-xs">Próxima: {formatDate(patient.nextAppointment)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 italic">
                    <span className="material-symbols-outlined text-base">event_busy</span>
                    <span className="text-xs">Sem agendamento</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex justify-end items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={`/dashboard/pacientes/${patient.id}`} onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 rounded-xl hover:bg-primary hover:text-white text-gray-400 transition-colors"
                  title="Ver Perfil"
                >
                  <span className="material-symbols-outlined">visibility</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-xl hover:bg-purple-100 text-gray-400 hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle more options
                }}
              >
                <span className="material-symbols-outlined">more_horiz</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


