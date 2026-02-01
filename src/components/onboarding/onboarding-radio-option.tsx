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
          "hover:border-purple-300",
          selected && "border-primary bg-purple-50/50 shadow-[0_0_0_1px_var(--color-primary),0_4px_12px_rgba(164,19,236,0.15)]"
        )}
      >
        {/* Radio indicator */}
        <div
          className={cn(
            "w-5 h-5 rounded-full border relative shrink-0 flex items-center justify-center transition-all",
            selected
              ? "border-primary bg-primary"
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
            selected ? "text-primary" : "text-slate-700"
          )}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
