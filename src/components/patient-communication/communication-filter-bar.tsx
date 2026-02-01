"use client"

import { useState } from "react"

interface CommunicationFilterBarProps {
  onFilterChange?: (filter: "all" | "manual" | "auto") => void
  onNewMessage?: () => void
}

export function CommunicationFilterBar({
  onFilterChange,
  onNewMessage,
}: CommunicationFilterBarProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "manual" | "auto">("all")

  const handleFilterChange = (filter: "all" | "manual" | "auto") => {
    setActiveFilter(filter)
    onFilterChange?.(filter)
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="p-1.5 bg-[#820AD1]/10 rounded-lg text-[#820AD1]">
            <span className="material-symbols-outlined text-[20px]">history_edu</span>
          </span>
          Timeline de Comunicação
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div className="bg-gray-100 p-1 rounded-xl flex text-sm font-medium self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-4 py-1.5 rounded-lg text-xs transition-all ${
              activeFilter === "all"
                ? "bg-white shadow-sm text-gray-900 font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            Tudo
          </button>
          <button
            onClick={() => handleFilterChange("manual")}
            className={`px-4 py-1.5 rounded-lg text-xs transition-all ${
              activeFilter === "manual"
                ? "bg-white shadow-sm text-gray-900 font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => handleFilterChange("auto")}
            className={`px-4 py-1.5 rounded-lg text-xs transition-all ${
              activeFilter === "auto"
                ? "bg-white shadow-sm text-gray-900 font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            Auto
          </button>
        </div>

        <button
          onClick={onNewMessage}
          className="bg-gray-900 hover:bg-[#820AD1] text-white text-sm font-bold py-2 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-black/5 transition-all transform hover:scale-105"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nova Mensagem
        </button>
      </div>
    </div>
  )
}
