import { cn } from "@/lib/utils"

interface OnboardingHeaderProps {
  title: string
  description: string
  emoji?: string
  className?: string
}

export function OnboardingHeader({
  title,
  description,
  emoji,
  className,
}: OnboardingHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
        {title}
      </h1>
      <p className="text-muted-foreground text-base leading-relaxed">
        {description}
        {emoji && <span className="ml-1">{emoji}</span>}
      </p>
    </div>
  )
}
