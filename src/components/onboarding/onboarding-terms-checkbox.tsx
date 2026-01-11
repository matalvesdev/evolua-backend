"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OnboardingTermsCheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  children: React.ReactNode
  className?: string
}

export function OnboardingTermsCheckbox({
  checked = false,
  onChange,
  children,
  className,
}: OnboardingTermsCheckboxProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 cursor-pointer group select-none",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <div
        className={cn(
          "w-5 h-5 mt-0.5 border-2 rounded shrink-0 transition-all flex items-center justify-center",
          checked
            ? "bg-primary border-primary"
            : "border-slate-300 bg-white"
        )}
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-slate-600 leading-snug group-hover:text-slate-800 transition-colors">
        {children}
      </span>
    </label>
  )
}
