"use client"

import { cn } from "@/lib/utils"

interface OnboardingMobileHeaderProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function OnboardingMobileHeader({
  currentStep,
  totalSteps,
  className,
}: OnboardingMobileHeaderProps) {
  return (
    <div
      className={cn(
        "md:hidden flex items-center justify-between p-6 pb-2 bg-white/50 backdrop-blur-sm sticky top-0 z-20",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 text-[#8A05BE]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5 text-[#8A05BE]"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        <span className="font-bold text-foreground">Evolua</span>
      </div>

      {/* Step Badge */}
      <div className="text-xs text-[#8A05BE] font-bold bg-[#8A05BE]/10 px-3 py-1 rounded-full border border-[#8A05BE]/20">
        Etapa {currentStep}/{totalSteps}
      </div>
    </div>
  )
}
