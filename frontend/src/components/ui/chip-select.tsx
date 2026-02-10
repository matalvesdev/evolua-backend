"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChipOption {
  value: string
  label: string
}

interface ChipSelectProps {
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  multiple?: boolean
  className?: string
}

export function ChipSelect({
  options,
  value,
  onChange,
  multiple = true,
  className,
}: ChipSelectProps) {
  const handleSelect = (optionValue: string) => {
    if (multiple) {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue))
      } else {
        onChange([...value, optionValue])
      }
    } else {
      onChange([optionValue])
    }
  }

  return (
    <div className={cn("flex gap-3 flex-wrap", className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={cn(
              "flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 border-2 transition-all duration-200",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/50"
            )}
          >
            <span className="text-sm font-medium leading-normal">
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
