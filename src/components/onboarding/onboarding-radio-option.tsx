"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OnboardingRadioOptionProps {
  label: string
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function OnboardingRadioOption({
  label,
  selected = false,
  onClick,
  className,
}: OnboardingRadioOptionProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer relative",
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
          "input-glass rounded-2xl p-5 flex items-center gap-4 transition-all",
          "hover:border-[#8A05BE]/30",
          selected && "border-[#8A05BE] bg-[#8A05BE]/10 shadow-[0_0_0_1px_#8A05BE,0_4px_12px_rgba(138,5,190,0.15)]"
        )}
      >
        {/* Radio indicator */}
        <div
          className={cn(
            "w-5 h-5 rounded-full border relative shrink-0 flex items-center justify-center transition-all",
            selected
              ? "border-[#8A05BE] bg-[#8A05BE]"
              : "border-slate-300 bg-slate-50"
          )}
        >
          {selected && (
            <div className="w-2 h-2 bg-white rounded-full" />
          )}
        </div>
        <span
          className={cn(
            "text-base font-bold transition-colors",
            selected ? "text-[#8A05BE]" : "text-slate-700"
          )}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
