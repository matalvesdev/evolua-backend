"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OnboardingRadioCardProps {
  icon: React.ReactNode
  label: React.ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function OnboardingRadioCard({
  icon,
  label,
  selected = false,
  onClick,
  className,
}: OnboardingRadioCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer group relative",
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
          "input-glass rounded-2xl p-4 h-full flex flex-col items-center justify-center gap-2 text-center transition-all min-h-[110px]",
          "focus:ring-2 focus:ring-primary/30",
          selected && "border-primary bg-purple-50/50 shadow-[0_0_0_1px_var(--color-primary),0_4px_12px_rgba(164,19,236,0.15)]"
        )}
      >
        <span
          className={cn(
            "text-3xl transition-colors mb-1",
            selected ? "text-primary" : "text-slate-400 group-hover:text-primary"
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "text-sm font-bold leading-snug transition-colors",
            selected ? "text-primary" : "text-slate-600"
          )}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          "absolute top-3 right-3 w-2 h-2 rounded-full transition-colors shadow-sm",
          selected ? "bg-primary" : "bg-transparent"
        )}
      />
    </div>
  )
}
