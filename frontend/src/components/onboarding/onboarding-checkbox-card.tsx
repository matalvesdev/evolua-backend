"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OnboardingCheckboxCardProps {
  icon: React.ReactNode
  label: React.ReactNode
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

export function OnboardingCheckboxCard({
  icon,
  label,
  checked = false,
  onChange,
  className,
}: OnboardingCheckboxCardProps) {
  return (
    <label className={cn("cursor-pointer group relative", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <div
        className={cn(
          "input-glass rounded-xl p-4 h-full flex flex-col items-center justify-center gap-2 text-center transition-all min-h-27.5",
          "hover:bg-[#8A05BE]/10 peer-focus:ring-2 peer-focus:ring-[#8A05BE]/50",
          checked && "border-[#8A05BE] bg-[#8A05BE]/10 shadow-[0_0_0_1px_#8A05BE]"
        )}
      >
        <span
          className={cn(
            "text-3xl transition-colors",
            checked ? "text-[#8A05BE]" : "text-slate-400 group-hover:text-[#8A05BE]"
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "text-sm font-semibold transition-colors",
            checked ? "text-[#8A05BE]" : "text-slate-600"
          )}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          "absolute top-2 right-2 w-5 h-5 rounded border transition-all flex items-center justify-center",
          checked
            ? "bg-[#8A05BE] border-[#8A05BE]"
            : "border-slate-300 bg-white"
        )}
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      </div>
    </label>
  )
}
