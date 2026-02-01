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
            ? "bg-primary text-white border-primary shadow-[0_4px_15px_rgba(164,19,236,0.3)]"
            : "text-slate-600 hover:bg-purple-50 hover:text-primary hover:border-purple-200"
        )}
      >
        <span className="text-lg">{icon}</span>
        {label}
      </div>
    </div>
  )
}
