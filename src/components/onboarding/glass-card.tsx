import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-3xl p-6 md:p-8 flex flex-col gap-8 items-center text-center",
        className
      )}
    >
      {children}
    </div>
  )
}
