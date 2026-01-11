"use client"

import * as React from "react"
import Link from "next/link"
import { useAppointments, useTodayAppointments, useAppointmentMutations } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function AgendamentosPage() {
  const [view, setView] = React.useState<"list" | "today">("today")
  const { appointments: todayAppointments, loading: todayLoading } = useTodayAppointments()
  const { appointments: allAppointments, loading: allLoading, updateFilters } = useAppointments()
  const { confirm, start, complete, cancel } = useAppointmentMutations()

  const appointments = view === "today" ? todayAppointments : allAppointments
  const loading = view === "today" ? todayLoading : allLoading

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header - Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Agendamentos
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie suas sessões
          </p>
        </div>
        <Link href="/dashboard/agendamentos/novo" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
            + Nova Sessão
          </Button>
        </Link>
      </div>

      {/* Tabs - Responsivo */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setView("today")}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            view === "today"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Hoje ({todayAppointments.length})
        </button>
        <button
          onClick={() => setView("list")}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            view === "list"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Todos
        </button>
      </div>

      {/* Filtros (apenas para view "list") - Responsivo */}
      {view === "list" && (
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              onChange={(e) => updateFilters({ status: e.target.value || undefined })}
            >
              <option value="">Todos os status</option>
              <option value="scheduled">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="in-progress">Em andamento</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              onChange={(e) => updateFilters({ type: e.target.value || undefined })}
            >
              <option value="">Todos os tipos</option>
              <option value="regular">Regular</option>
              <option value="evaluation">Avaliação</option>
              <option value="reevaluation">Reavaliação</option>
              <option value="discharge">Alta</option>
            </select>
          </div>
        </Card>
      )}

      {/* Lista de agendamentos */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {view === "today"
              ? "Nenhuma sessão agendada para hoje"
              : "Nenhum agendamento encontrado"}
          </p>
          <Link href="/dashboard/agendamentos/novo">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Agendar sessão
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Time and Patient Info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="text-center min-w-12 sm:min-w-15">
                    <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {new Date(appointment.dateTime).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {appointment.duration} min
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {appointment.patientName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatType(appointment.type)}
                    </p>
                  </div>
                  {/* Status badge - visible on mobile in this row */}
                  <div className="sm:hidden">
                    <StatusBadge status={appointment.status} />
                  </div>
                </div>
                
                {/* Actions row - full width on mobile */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
                  {/* Status badge - hidden on mobile, visible on larger screens */}
                  <div className="hidden sm:block">
                    <StatusBadge status={appointment.status} />
                  </div>
                  <AppointmentActions
                    id={appointment.id}
                    status={appointment.status}
                    onConfirm={() => confirm(appointment.id)}
                    onStart={() => start(appointment.id)}
                    onComplete={() => complete(appointment.id)}
                    onCancel={() => cancel(appointment.id, "other", "therapist")}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AppointmentActions({
  status,
  onConfirm,
  onStart,
  onComplete,
  onCancel,
}: {
  id: string
  status: string
  onConfirm: () => void
  onStart: () => void
  onComplete: () => void
  onCancel: () => void
}) {
  if (status === "scheduled") {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onConfirm} className="text-xs sm:text-sm">
          Confirmar
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 text-xs sm:text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (status === "confirmed") {
    return (
      <div className="flex gap-2">
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm" onClick={onStart}>
          Iniciar
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 text-xs sm:text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (status === "in-progress") {
    return (
      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm" onClick={onComplete}>
        Finalizar
      </Button>
    )
  }

  return null
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Agendado", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    confirmed: { label: "Confirmado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    "in-progress": { label: "Em andamento", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    completed: { label: "Concluído", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    "no-show": { label: "Não compareceu", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  }

  const config = statusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-800" }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

function formatType(type: string): string {
  const types: Record<string, string> = {
    regular: "Sessão Regular",
    evaluation: "Avaliação",
    reevaluation: "Reavaliação",
    discharge: "Alta",
  }
  return types[type] ?? type
}
