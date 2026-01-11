"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Label } from "@/components/ui/label"

interface CheckboxOption {
  value: string
  label: string
}

interface CheckboxGroupProps {
  options: CheckboxOption[]
  value: string[]
  onChange: (value: string[]) => void
  columns?: 1 | 2
  className?: string
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  columns = 1,
  className,
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue])
    } else {
      onChange(value.filter((v) => v !== optionValue))
    }
  }

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
  }

  return (
    <div className={cn("grid gap-x-4 gap-y-2", gridCols[columns], className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex gap-x-3 py-3 flex-row items-center cursor-pointer"
        >
          <Checkbox
            checked={value.includes(option.value)}
            onCheckedChange={(checked) =>
              handleChange(option.value, checked === true)
            }
          />
          <span className="text-base font-normal leading-normal text-foreground">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  )
}
