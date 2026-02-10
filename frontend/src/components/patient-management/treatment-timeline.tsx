"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { 
  Calendar, 
  FileText, 
  Pill, 
  AlertCircle, 
  Activity,
  ClipboardList,
  TrendingUp
} from "lucide-react"

export interface TimelineEvent {
  id: string
  date: Date
  type: "diagnosis" | "medication" | "allergy" | "assessment" | "progress_note" | "treatment_plan"
  title: string
  description: string
  severity?: "mild" | "moderate" | "severe" | "life_threatening" | "unknown"
  metadata?: Record<string, string | number | boolean>
}

export interface TreatmentTimelineProps {
  events: TimelineEvent[]
  patientName?: string
  onEventClick?: (event: TimelineEvent) => void
}

const eventTypeConfig = {
  diagnosis: {
    icon: ClipboardList,
    label: "Diagnóstico",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50"
  },
  medication: {
    icon: Pill,
    label: "Medicação",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50"
  },
  allergy: {
    icon: AlertCircle,
    label: "Alergia",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50"
  },
  assessment: {
    icon: Activity,
    label: "Avaliação",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgColor: "bg-purple-50"
  },
  progress_note: {
    icon: FileText,
    label: "Nota de Progresso",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50"
  },
  treatment_plan: {
    icon: TrendingUp,
    label: "Plano de Tratamento",
    color: "bg-indigo-500",
    textColor: "text-indigo-700",
    bgColor: "bg-indigo-50"
  }
}

const severityLabels = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Grave",
  life_threatening: "Risco de Vida",
  unknown: "Desconhecida"
}

const severityColors = {
  mild: "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  severe: "bg-orange-100 text-orange-700",
  life_threatening: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-700"
}

export function TreatmentTimeline({
  events,
  patientName,
  onEventClick
}: TreatmentTimelineProps) {
  // Sort events by date (most recent first)
  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [events])

  // Group events by month/year
  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {}
    
    sortedEvents.forEach(event => {
      const monthYear = event.date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      })
      
      if (!groups[monthYear]) {
        groups[monthYear] = []
      }
      groups[monthYear].push(event)
    })
    
    return groups
  }, [sortedEvents])

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">Nenhum evento no histórico</p>
        <p className="text-xs text-gray-500 mt-1">
          Os eventos do tratamento aparecerão aqui conforme forem adicionados
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Linha do Tempo do Tratamento</h3>
          {patientName && (
            <p className="text-sm text-gray-600 mt-1">Paciente: {patientName}</p>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {events.length} {events.length === 1 ? "evento" : "eventos"}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
          <div key={monthYear}>
            {/* Month Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 capitalize">
                  {monthYear}
                </h4>
                <p className="text-xs text-gray-500">
                  {monthEvents.length} {monthEvents.length === 1 ? "evento" : "eventos"}
                </p>
              </div>
            </div>

            {/* Events in this month */}
            <div className="ml-6 border-l-2 border-gray-200 pl-6 space-y-4">
              {monthEvents.map((event) => {
                const config = eventTypeConfig[event.type]
                const Icon = config.icon

                return (
                  <div
                    key={event.id}
                    className={`relative ${onEventClick ? "cursor-pointer" : ""}`}
                    onClick={() => onEventClick?.(event)}
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[29px] top-2">
                      <div className={`w-4 h-4 rounded-full ${config.color} border-4 border-white`} />
                    </div>

                    {/* Event Card */}
                    <Card className={`p-4 hover:shadow-md transition-shadow ${config.bgColor}`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${config.textColor}`}>
                                  {config.label}
                                </span>
                                {event.severity && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${severityColors[event.severity]}`}>
                                    {severityLabels[event.severity]}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-semibold text-gray-900 mb-1">
                                {event.title}
                              </h5>
                              <p className="text-sm text-gray-700 mb-2">
                                {event.description}
                              </p>
                              
                              {/* Metadata */}
                              {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(event.metadata).map(([key, value]) => (
                                    <span
                                      key={key}
                                      className="px-2 py-1 bg-white rounded text-xs text-gray-600"
                                    >
                                      <span className="font-medium">{key}:</span> {String(value)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex-shrink-0 text-right">
                              <div className="text-xs font-medium text-gray-900">
                                {formatDate(event.date)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatTime(event.date)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <Card className="p-4 bg-gray-50">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">Legenda</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(eventTypeConfig).map(([type, config]) => {
            const Icon = config.icon
            return (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded ${config.color} flex items-center justify-center`}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs text-gray-700">{config.label}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
