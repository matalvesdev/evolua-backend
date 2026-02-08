"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PatientStatusType } from "@/lib/core/domain/types"

export interface StatusStatistics {
  totalPatients: number
  statusCounts: Record<PatientStatusType, number>
  recentTransitions: StatusTransitionItem[]
  averageTimeInStatus?: Record<PatientStatusType, number>
}

export interface StatusTransitionItem {
  id: string
  patientName: string
  patientId: string
  fromStatus: PatientStatusType | null
  toStatus: PatientStatusType
  reason?: string
  timestamp: Date
  changedByName: string
}

export interface PatientStatusDashboardProps {
  statistics: StatusStatistics
  onStatusClick?: (status: PatientStatusType) => void
  onTransitionClick?: (transition: StatusTransitionItem) => void
}

const statusConfig: Record<string, { 
  label: string
  color: string
  bgColor: string
  icon: string
  description: string
}> = {
  new: {
    label: "Novos",
    color: "text-blue-700",
    bgColor: "bg-blue-100 border-blue-200",
    icon: "person_add",
    description: "Pacientes recém-cadastrados"
  },
  active: {
    label: "Ativos",
    color: "text-green-700",
    bgColor: "bg-green-100 border-green-200",
    icon: "check_circle",
    description: "Em tratamento ativo"
  },
  on_hold: {
    label: "Em Espera",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100 border-yellow-200",
    icon: "pause_circle",
    description: "Tratamento temporariamente suspenso"
  },
  discharged: {
    label: "Alta",
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-200",
    icon: "task_alt",
    description: "Tratamento concluído"
  },
  inactive: {
    label: "Inativos",
    color: "text-red-700",
    bgColor: "bg-red-100 border-red-200",
    icon: "cancel",
    description: "Não estão mais em tratamento"
  },
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / 60000)
  const diffInHours = Math.floor(diffInMs / 3600000)
  const diffInDays = Math.floor(diffInMs / 86400000)

  if (diffInMinutes < 1) return "agora mesmo"
  if (diffInMinutes < 60) return `há ${diffInMinutes} min`
  if (diffInHours < 24) return `há ${diffInHours}h`
  if (diffInDays === 1) return "ontem"
  if (diffInDays < 7) return `há ${diffInDays} dias`
  if (diffInDays < 30) return `há ${Math.floor(diffInDays / 7)} semanas`
  return `há ${Math.floor(diffInDays / 30)} meses`
}

function formatDays(days: number): string {
  if (days < 1) return "< 1 dia"
  if (days === 1) return "1 dia"
  if (days < 7) return `${Math.round(days)} dias`
  if (days < 30) return `${Math.round(days / 7)} semanas`
  return `${Math.round(days / 30)} meses`
}

export function PatientStatusDashboard({
  statistics,
  onStatusClick,
  onTransitionClick,
}: PatientStatusDashboardProps) {
  const statusOrder: string[] = ["new", "active", "on_hold", "on-hold", "discharged", "inactive"]

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Status dos Pacientes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do status de {statistics.totalPatients} pacientes
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
          <span className="material-symbols-outlined text-primary">groups</span>
          <div>
            <p className="text-xs text-muted-foreground">Total de Pacientes</p>
            <p className="text-2xl font-bold text-primary">{statistics.totalPatients}</p>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statusOrder.map((status) => {
          const config = statusConfig[status]
          const count = (statistics.statusCounts as Record<string, number>)[status] || 0
          const percentage = statistics.totalPatients > 0 
            ? Math.round((count / statistics.totalPatients) * 100) 
            : 0
          const avgTime = (statistics.averageTimeInStatus as Record<string, number> | undefined)?.[status]

          return (
            <Card
              key={status}
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${config.bgColor} border-2`}
              onClick={() => onStatusClick?.(status as PatientStatusType)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className={`material-symbols-outlined text-3xl ${config.color}`}>
                    {config.icon}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {percentage}%
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{count}</p>
                  <p className="text-sm font-semibold text-gray-700 mb-1">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  {avgTime !== undefined && avgTime > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      Média: {formatDays(avgTime)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Transitions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            Transições Recentes
          </CardTitle>
          <CardDescription>
            Últimas mudanças de status dos pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statistics.recentTransitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
              <p>Nenhuma transição de status registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statistics.recentTransitions.map((transition) => {
                const fromConfig = transition.fromStatus ? statusConfig[transition.fromStatus] : null
                const toConfig = statusConfig[transition.toStatus]

                return (
                  <div
                    key={transition.id}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onTransitionClick?.(transition)}
                  >
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{transition.patientName}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(transition.timestamp)}</p>
                    </div>

                    {/* Status Transition */}
                    <div className="flex items-center gap-2">
                      {fromConfig && (
                        <>
                          <Badge variant="outline" className={`${fromConfig.bgColor} border`}>
                            <span className={`material-symbols-outlined text-xs mr-1 ${fromConfig.color}`}>
                              {fromConfig.icon}
                            </span>
                            {fromConfig.label}
                          </Badge>
                          <span className="material-symbols-outlined text-muted-foreground text-sm">
                            arrow_forward
                          </span>
                        </>
                      )}
                      <Badge variant="outline" className={`${toConfig.bgColor} border`}>
                        <span className={`material-symbols-outlined text-xs mr-1 ${toConfig.color}`}>
                          {toConfig.icon}
                        </span>
                        {toConfig.label}
                      </Badge>
                    </div>

                    {/* Changed By */}
                    <div className="hidden md:block text-xs text-muted-foreground">
                      por {transition.changedByName}
                    </div>

                    {/* Reason Indicator */}
                    {transition.reason && (
                      <span className="material-symbols-outlined text-muted-foreground text-sm" title={transition.reason}>
                        info
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
