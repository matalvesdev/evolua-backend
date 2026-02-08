"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OnboardingRadioChipWithIconProps {
  icon: React.ReactNode
  label: string
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function OnboardingRadioChipWithIcon({
  icon,
  label,
  selected = false,
  onClick,
  className,
}: OnboardingRadioChipWithIconProps) {
  return (
    <div
      onClick={onClick}
      className={cn("cursor-pointer", className)}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div
        className={cn(
          "px-4 py-3 rounded-xl input-glass text-sm font-semibold transition-all flex items-center gap-3",
          selected
            ? "bg-[#8A05BE] text-white border-[#8A05BE] shadow-[0_4px_15px_rgba(138,5,190,0.3)]"
            : "text-slate-600 hover:bg-[#8A05BE]/5 hover:text-[#8A05BE] hover:border-[#8A05BE]/30"
        )}
      >
        <span className="text-lg">{icon}</span>
        {label}
      </div>
    </div>
  )
}
