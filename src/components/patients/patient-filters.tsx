"use client"

import { useState } from "react"

interface PatientFiltersProps {
  totalPatients: number
  activeCount: number
  onSearchChange: (search: string) => void
}

export function PatientFilters({ totalPatients, activeCount, onSearchChange }: PatientFiltersProps) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  const filters = [
    {
      id: "active",
      label: "Ativos",
      color: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
      icon: <span className="w-2 h-2 rounded-full bg-green-500" />,
      count: activeCount,
    },
    {
      id: "tea",
      label: "TEA",
      color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
      icon: <span className="material-symbols-outlined text-base">psychology</span>,
    },
    {
      id: "upcoming",
      label: "Próxima Sessão",
      color: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
      icon: <span className="material-symbols-outlined text-base">event_upcoming</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Search Bar */}
      <div className="relative w-full max-w-3xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-primary text-2xl">search</span>
        </div>
        <input
          className="block w-full pl-12 pr-4 py-4 border border-white/60 bg-white/70 backdrop-blur-xl rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white shadow-lg shadow-purple-100/50 transition-all font-display text-lg"
          placeholder="Busque por nome, especialidade ou responsável..."
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
            className={`px-4 py-2 rounded-full font-bold text-sm border transition-colors flex items-center gap-2 ${
              activeFilter === filter.id ? "ring-2 ring-primary/50" : ""
            } ${filter.color}`}
          >
            {filter.icon}
            {filter.label}
            {filter.count !== undefined && (
              <span className="bg-white/50 px-1.5 rounded-md text-[10px] ml-1">{filter.count}</span>
            )}
          </button>
        ))}

        <button className="px-4 py-2 rounded-full bg-white/50 text-gray-600 font-bold text-sm border border-dashed border-gray-400 hover:bg-white hover:border-primary hover:text-primary transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-base">filter_list</span>
          Filtro Personalizado
        </button>

        <div className="ml-auto text-sm text-gray-500 hidden md:block">
          Mostrando <span className="font-bold text-gray-800">{totalPatients}</span> de{" "}
          <span className="font-bold text-gray-800">{totalPatients}</span> pacientes
        </div>
      </div>
    </div>
  )
}
