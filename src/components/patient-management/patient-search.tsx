"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface PatientSearchCriteria {
  query?: string
  status?: "new" | "active" | "on_hold" | "discharged" | "inactive"
  ageRange?: { min?: number; max?: number }
  gender?: "male" | "female" | "other"
}

interface PatientSearchProps {
  onSearch: (criteria: PatientSearchCriteria) => void
  isLoading?: boolean
}

export function PatientSearch({ onSearch, isLoading = false }: PatientSearchProps) {
  const [query, setQuery] = React.useState("")
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [advancedCriteria, setAdvancedCriteria] = React.useState<PatientSearchCriteria>({})

  const handleSimpleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({ query })
  }

  const handleAdvancedSearch = () => {
    onSearch({ query, ...advancedCriteria })
  }

  const handleClearFilters = () => {
    setQuery("")
    setAdvancedCriteria({})
    onSearch({})
  }

  return (
    <div className="space-y-4">
      {/* Simple Search Bar */}
      <form onSubmit={handleSimpleSearch} className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-primary text-2xl">search</span>
        </div>
        <Input
          className="block w-full pl-12 pr-32 py-4 border border-white/60 bg-white/70 backdrop-blur-xl rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white shadow-lg shadow-purple-100/50 transition-all font-display text-lg"
          placeholder="Busque por nome, CPF, telefone ou email..."
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-primary hover:text-primary/80"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            Filtros
          </Button>
        </div>
      </form>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(false)}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={advancedCriteria.status || ""}
                onChange={(e) =>
                  setAdvancedCriteria({
                    ...advancedCriteria,
                    status: e.target.value as any || undefined
                  })
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-md"
              >
                <option value="">Todos</option>
                <option value="new">Novo</option>
                <option value="active">Ativo</option>
                <option value="on_hold">Em Espera</option>
                <option value="discharged">Alta</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gênero
              </label>
              <select
                value={advancedCriteria.gender || ""}
                onChange={(e) =>
                  setAdvancedCriteria({
                    ...advancedCriteria,
                    gender: e.target.value as any || undefined
                  })
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-md"
              >
                <option value="">Todos</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
              </select>
            </div>

            {/* Age Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faixa Etária
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={advancedCriteria.ageRange?.min || ""}
                  onChange={(e) =>
                    setAdvancedCriteria({
                      ...advancedCriteria,
                      ageRange: {
                        ...advancedCriteria.ageRange,
                        min: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })
                  }
                  className="w-full"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={advancedCriteria.ageRange?.max || ""}
                  onChange={(e) =>
                    setAdvancedCriteria({
                      ...advancedCriteria,
                      ageRange: {
                        ...advancedCriteria.ageRange,
                        max: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              disabled={isLoading}
            >
              Limpar Filtros
            </Button>
            <Button
              type="button"
              onClick={handleAdvancedSearch}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Buscando..." : "Aplicar Filtros"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
