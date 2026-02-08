"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OnboardingChipRadioProps {
  label: string
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function OnboardingChipRadio({
  label,
  selected = false,
  onClick,
  className,
}: OnboardingChipRadioProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer",
        className
      )}
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
          "px-6 py-3 rounded-full input-glass text-sm font-bold transition-all",
          selected
            ? "bg-[#8A05BE] text-white border-[#8A05BE] shadow-[0_4px_15px_rgba(138,5,190,0.3)]"
            : "text-slate-600 hover:text-[#8A05BE] hover:border-[#8A05BE]/30"
        )}
      >
        {label}
      </div>
    </div>
  )
}
