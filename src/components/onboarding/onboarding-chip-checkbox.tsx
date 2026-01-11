"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OnboardingChipCheckboxProps {
  label: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

export function OnboardingChipCheckbox({
  label,
  checked = false,
  onChange,
  className,
}: OnboardingChipCheckboxProps) {
  return (
    <label className={cn("cursor-pointer", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <div
        className={cn(
          "px-4 py-2 rounded-lg input-glass text-sm font-medium transition-all",
          checked
            ? "bg-primary/10 text-primary border-primary font-bold"
            : "text-slate-600 hover:bg-purple-50 hover:text-primary"
        )}
      >
        {label}
      </div>
    </label>
  )
}
