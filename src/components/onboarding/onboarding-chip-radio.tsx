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
            ? "bg-primary text-white border-primary shadow-[0_4px_15px_rgba(164,19,236,0.3)]"
            : "text-slate-600 hover:text-primary hover:border-purple-300"
        )}
      >
        {label}
      </div>
    </div>
  )
}
