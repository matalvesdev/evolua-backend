"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface OnboardingFormFieldProps {
  label: string
  icon?: React.ReactNode
  hint?: string
  children: React.ReactNode
  className?: string
}

export function OnboardingFormField({
  label,
  icon,
  hint,
  children,
  className,
}: OnboardingFormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider opacity-90 flex items-center gap-2">
        {icon && (
          <span className="text-primary">{icon}</span>
        )}
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground ml-1">{hint}</p>
      )}
    </div>
  )
}
