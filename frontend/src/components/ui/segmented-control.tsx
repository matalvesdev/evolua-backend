"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  name: string
  className?: string
}

export function SegmentedControl({
  options,
  value,
  onChange,
  name,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-center rounded-full bg-muted p-1.5",
        className
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-full px-4 text-sm font-medium leading-normal transition-all duration-200",
            value === option.value
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="truncate">{option.label}</span>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="invisible absolute w-0 h-0"
          />
        </label>
      ))}
    </div>
  )
}
