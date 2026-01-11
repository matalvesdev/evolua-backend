"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectNativeProps extends React.ComponentProps<"select"> {
  className?: string
}

export function SelectNative({ className, children, ...props }: SelectNativeProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-lg border border-input bg-background px-4 py-3 pr-10 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      </span>
    </div>
  )
}
