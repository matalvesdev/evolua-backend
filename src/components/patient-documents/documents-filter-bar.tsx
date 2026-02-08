"use client"

import { useState } from "react"

interface DocumentsFilterBarProps {
  onSearch?: (query: string) => void
  onFilterChange?: (filter: string) => void
  onNewDocument?: () => void
}

const filters = [
  { id: "all", label: "Todos" },
  { id: "pdf", label: "PDF" },
  { id: "images", label: "Imagens" },
  { id: "audio", label: "Áudios" },
]

export function DocumentsFilterBar({
  onSearch,
  onFilterChange,
  onNewDocument,
}: DocumentsFilterBarProps) {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const handleFilterClick = (filterId: string) => {
    setActiveFilter(filterId)
    onFilterChange?.(filterId)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  return (
    <div className="p-6 md:p-8 border-b border-gray-100/50 bg-white/30 backdrop-blur-md flex flex-col lg:flex-row justify-between items-center gap-6">
      <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
        {/* Search Input */}
        <div className="relative w-full md:w-80 group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8A05BE] transition-colors">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-white border border-gray-200 rounded-full py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#8A05BE]/20 focus:border-[#8A05BE]/30 outline-none shadow-sm transition-all placeholder:text-gray-400 text-gray-700"
            placeholder="Buscar documento..."
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterClick(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === filter.id
                  ? "bg-gray-900 text-white shadow-lg shadow-gray-200 hover:shadow-xl"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#8A05BE] hover:border-[#8A05BE]/20 shadow-sm"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* New Document Button */}
      <button
        onClick={onNewDocument}
        className="flex items-center gap-2 bg-[#8A05BE] hover:bg-[#7A04AA] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#8A05BE]/25 hover:shadow-[#8A05BE]/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 w-full lg:w-auto justify-center"
      >
        <span className="material-symbols-outlined">add</span>
        <span>Novo Documento</span>
      </button>
    </div>
  )
}
