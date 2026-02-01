"use client"

import { useState } from "react"

interface ActivityChecklistItemProps {
  title: string
  description: string
  location: "home" | "office" | "completed"
  duration?: string
  defaultChecked?: boolean
  onToggle?: (checked: boolean) => void
}

const locationConfig = {
  home: {
    label: "Casa",
    color: "purple",
    bgColor: "bg-purple-50",
    textColor: "text-[#820AD1]",
  },
  office: {
    label: "Consultório",
    color: "orange",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
  },
  completed: {
    label: "Concluído",
    color: "green",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
}

export function ActivityChecklistItem({
  title,
  description,
  location,
  duration,
  defaultChecked = false,
  onToggle,
}: ActivityChecklistItemProps) {
  const [checked, setChecked] = useState(defaultChecked)
  const locationInfo = locationConfig[location]

  const handleToggle = () => {
    const newChecked = !checked
    setChecked(newChecked)
    onToggle?.(newChecked)
  }

  return (
    <label className="group flex items-start gap-5 p-5 bg-white/80 rounded-2xl border border-transparent hover:border-[#820AD1]/20 shadow-sm hover:shadow-md transition-all cursor-pointer">
      <input
        type="checkbox"
        className="hidden peer"
        checked={checked}
        onChange={handleToggle}
      />
      <div className="w-6 h-6 rounded-lg border-2 border-gray-300 flex items-center justify-center flex-shrink-0 transition-all bg-white peer-checked:bg-[#820AD1] peer-checked:border-[#820AD1] mt-1">
        <span className={`material-symbols-outlined text-white text-[16px] transition-opacity font-bold ${checked ? 'opacity-100' : 'opacity-0'}`}>
          check
        </span>
      </div>

      <div className="flex-1">
        <span className={`block text-base font-bold text-gray-900 group-hover:text-[#820AD1] transition-colors ${checked ? 'line-through text-gray-500' : ''}`}>
          {title}
        </span>
        <span className={`block text-sm text-gray-600 mt-1.5 leading-relaxed ${checked ? 'text-gray-400' : ''}`}>
          {description}
        </span>

        <div className="flex gap-3 mt-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${locationInfo.bgColor} ${locationInfo.textColor} text-[10px] font-bold uppercase tracking-wide`}>
            <span className="material-symbols-outlined text-[14px]">
              {location === "home" ? "home" : location === "office" ? "medical_services" : "check_circle"}
            </span>
            {locationInfo.label}
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wide">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              {duration}
            </span>
          )}
        </div>
      </div>
    </label>
  )
}
