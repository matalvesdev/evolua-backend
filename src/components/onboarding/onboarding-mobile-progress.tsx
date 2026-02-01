"use client"

import { cn } from "@/lib/utils"

interface OnboardingMobileProgressProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function OnboardingMobileProgress({
  currentStep,
  totalSteps,
  className,
}: OnboardingMobileProgressProps) {
  return (
    <div className={cn("md:hidden mt-8 flex justify-center pb-8", className)}>
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep

          return (
            <div
              key={stepNumber}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isActive ? "w-8 bg-primary" : "w-2 bg-slate-200"
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
