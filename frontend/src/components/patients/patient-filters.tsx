"use client"

import { useState } from "react"

interface PatientFiltersProps {
  totalPatients: number
  activeCount: number
  onSearchChange: (search: string) => void
}

export function PatientFilters({ totalPatients, activeCount, onSearchChange }: PatientFiltersProps) {
  const [search, setSearch] = useState("")

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-md group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#8A05BE] transition-colors text-xl">
            search
          </span>
        </div>
        <input
          className="input-glass block w-full pl-11 pr-4 py-2.5 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
          placeholder="Buscar por nome, e-mail ou telefone..."
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Active count badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {activeCount} Ativos
        </span>

        {/* Total count badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
          <span className="material-symbols-outlined text-sm">group</span>
          {totalPatients} Total
        </span>
      </div>
    </div>
  )
}
