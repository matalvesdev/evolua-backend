"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OnboardingRadioWithIconProps {
  icon: React.ReactNode
  label: string
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function OnboardingRadioWithIcon({
  icon,
  label,
  selected = false,
  onClick,
  className,
}: OnboardingRadioWithIconProps) {
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
          "input-glass rounded-xl p-4 h-full flex items-center gap-3 transition-all",
          "hover:bg-purple-50",
          selected && "border-primary bg-purple-50/50 shadow-[0_0_0_1px_var(--color-primary)]"
        )}
      >
        <span
          className={cn(
            "text-2xl transition-colors",
            selected ? "text-primary" : "text-slate-400 group-hover:text-primary"
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "text-sm font-semibold transition-colors",
            selected ? "text-primary" : "text-slate-600"
          )}
        >
          {label}
        </span>
      </div>
      {/* Check indicator */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 right-4 w-4 h-4 rounded-full border transition-all flex items-center justify-center",
          selected
            ? "border-primary bg-primary opacity-100"
            : "border-slate-300 opacity-0"
        )}
      >
        <Check className="size-2.5 text-white" strokeWidth={3} />
      </div>
    </div>
  )
}
