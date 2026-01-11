"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type OnboardingInputProps = React.InputHTMLAttributes<HTMLInputElement>

const OnboardingInput = React.forwardRef<HTMLInputElement, OnboardingInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "input-glass w-full px-5 py-3.5 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
OnboardingInput.displayName = "OnboardingInput"

export { OnboardingInput }
