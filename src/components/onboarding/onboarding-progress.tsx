import { cn } from "@/lib/utils"

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  className,
}: OnboardingProgressProps) {
  const progressPercentage = (currentStep / totalSteps) * 100

  return (
    <div className={cn("hidden md:flex flex-col gap-2 mb-10 w-full max-w-md", className)}>
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-muted-foreground">
          Progresso do Onboarding
        </span>
        <span className="text-sm font-bold text-primary">
          Etapa {currentStep} de {totalSteps}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out progress-glow"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}
