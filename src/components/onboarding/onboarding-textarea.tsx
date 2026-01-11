"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type OnboardingTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const OnboardingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  OnboardingTextareaProps
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "w-full input-glass rounded-xl p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-25 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
OnboardingTextarea.displayName = "OnboardingTextarea"

export { OnboardingTextarea }
