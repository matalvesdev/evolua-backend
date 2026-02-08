"use client"

import { cn } from "@/lib/utils"

interface FloatingBadgeProps {
  icon: React.ReactNode
  label: string
  iconBgClassName?: string
  className?: string
  animationDuration?: string
  animationDelay?: string
}

export function FloatingBadge({
  icon,
  label,
  iconBgClassName = "bg-[#8A05BE]/10",
  className,
  animationDuration = "5s",
  animationDelay = "0s",
}: FloatingBadgeProps) {
  return (
    <div
      className={cn(
        "bg-white/90 backdrop-blur-md border border-white p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-float",
        className
      )}
      style={{
        animationDuration,
        animationDelay,
      }}
    >
      <div
        className={cn(
          "p-1.5 rounded-full flex items-center justify-center",
          iconBgClassName
        )}
      >
        {icon}
      </div>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </div>
  )
}
