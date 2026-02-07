"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PatientStatusType } from "@/lib/core/domain/types"

export interface StatusFilterBarProps {
  statusCounts: Record<PatientStatusType, number>
  selectedStatuses: PatientStatusType[]
  onStatusToggle: (status: PatientStatusType) => void
  onClearFilters: () => void
  showSearch?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
}

const statusConfig: Record<PatientStatusType, {
  label: string
  color: string
  bgColor: string
  hoverColor: string
  icon: string
}> = {
  new: {
    label: "Novos",
    color: "text-blue-700",
    bgColor: "bg-blue-100 border-blue-200",
    hoverColor: "hover:bg-blue-200",
    icon: "person_add"
  },
  active: {
    label: "Ativos",
    color: "text-green-700",
    bgColor: "bg-green-100 border-green-200",
    hoverColor: "hover:bg-green-200",
    icon: "check_circle"
  },
  on_hold: {
    label: "Em Espera",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100 border-yellow-200",
    hoverColor: "hover:bg-yellow-200",
    icon: "pause_circle"
  },
  discharged: {
    label: "Alta",
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-200",
    hoverColor: "hover:bg-gray-200",
    icon: "task_alt"
  },
  inactive: {
    label: "Inativos",
    color: "text-red-700",
    bgColor: "bg-red-100 border-red-200",
    hoverColor: "hover:bg-red-200",
    icon: "cancel"
  },
}

export function StatusFilterBar({
  statusCounts,
  selectedStatuses,
  onStatusToggle,
  onClearFilters,
  showSearch = true,
  searchValue = "",
  onSearchChange,
}: StatusFilterBarProps) {
  const statusOrder: PatientStatusType[] = ["active", "new", "on_hold", "discharged", "inactive"]
  const hasActiveFilters = selectedStatuses.length > 0

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {showSearch && (
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-primary text-xl">search</span>
          </div>
          <input
            className="block w-full pl-12 pr-4 py-3 border border-gray-200 bg-white rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm transition-all text-sm"
            placeholder="Buscar pacientes por nome, CPF ou telefone..."
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      )}

      {/* Status Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="material-symbols-outlined text-base">filter_list</span>
          <span className="font-semibold">Filtrar por status:</span>
        </div>

        {statusOrder.map((status) => {
          const config = statusConfig[status]
          const count = statusCounts[status] || 0
          const isSelected = selectedStatuses.includes(status)

          return (
            <button
              key={status}
              onClick={() => onStatusToggle(status)}
              className={`
                px-4 py-2 rounded-full font-semibold text-sm border-2 transition-all 
                flex items-center gap-2
                ${isSelected 
                  ? `${config.bgColor} ${config.color} border-current ring-2 ring-primary/30 shadow-md` 
                  : `bg-white text-gray-600 border-gray-200 ${config.hoverColor} hover:border-gray-300`
                }
              `}
            >
              <span className={`material-symbols-outlined text-base ${isSelected ? config.color : 'text-gray-500'}`}>
                {config.icon}
              </span>
              <span>{config.label}</span>
              <Badge 
                variant="outline" 
                className={`
                  ml-1 text-xs px-1.5 py-0
                  ${isSelected ? 'bg-white/60' : 'bg-gray-100'}
                `}
              >
                {count}
              </Badge>
            </button>
          )
        })}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <span className="material-symbols-outlined text-base mr-1">close</span>
            Limpar Filtros
          </Button>
        )}

        {/* Active Filters Count */}
        {hasActiveFilters && (
          <div className="ml-auto text-sm text-muted-foreground hidden md:flex items-center gap-2">
            <span className="material-symbols-outlined text-base">filter_alt</span>
            <span>
              {selectedStatuses.length} {selectedStatuses.length === 1 ? 'filtro ativo' : 'filtros ativos'}
            </span>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <span className="material-symbols-outlined text-primary text-base">info</span>
          <span className="text-sm text-muted-foreground">
            Mostrando pacientes com status:{" "}
            <span className="font-semibold text-foreground">
              {selectedStatuses.map(s => statusConfig[s].label).join(", ")}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
