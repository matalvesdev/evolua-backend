"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioCardOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface RadioCardGroupProps {
  options: RadioCardOption[]
  value: string
  onChange: (value: string) => void
  name: string
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function RadioCardGroup({
  options,
  value,
  onChange,
  name,
  columns = 2,
  className,
}: RadioCardGroupProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-4 rounded-xl border-2 bg-card p-4 transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            {option.icon && (
              <span className="text-primary shrink-0">{option.icon}</span>
            )}
            <span
              className={cn(
                "text-sm font-medium",
                option.icon ? "" : "text-center w-full"
              )}
            >
              {option.label}
            </span>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={(e) => onChange(e.target.value)}
              className="invisible absolute w-0 h-0"
            />
          </label>
        )
      })}
    </div>
  )
}
