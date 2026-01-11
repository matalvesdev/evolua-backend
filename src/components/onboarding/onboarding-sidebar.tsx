"use client"

import { cn } from "@/lib/utils"
import { Sparkles, Bot } from "lucide-react"
import { FloatingBadge } from "./floating-badge"

interface FloatingBadgeConfig {
  icon: React.ReactNode
  label: string
  iconBgClassName?: string
  className?: string
  animationDuration?: string
  animationDelay?: string
}

interface OnboardingSidebarProps {
  illustration?: string
  illustrationAlt?: string
  tagline?: string
  headline?: React.ReactNode
  floatingBadges?: FloatingBadgeConfig[]
  className?: string
}

const defaultFloatingBadges: FloatingBadgeConfig[] = [
  {
    icon: <Sparkles className="size-3.5 text-primary" />,
    label: "Personalizado",
    iconBgClassName: "bg-purple-100",
    className: "absolute top-[30%] right-[22%]",
    animationDuration: "4s",
  },
  {
    icon: <Bot className="size-3.5 text-blue-600" />,
    label: "Automatizado",
    iconBgClassName: "bg-blue-100",
    className: "absolute bottom-[35%] left-[22%]",
    animationDuration: "5s",
    animationDelay: "1s",
  },
]

export function OnboardingSidebar({
  illustration = "https://lh3.googleusercontent.com/aida-public/AB6AXuAfY-Azwddf2y-e4nE9gdmd8TqJub6wjbihKN3kn3Bvs-CNULneKFdY-lnk7uMmw1VyNJa1blZgFc9kLINNfolZRz3q3d_7J8sq4Ca55988WRk_3nBQYfnNMWtfDcqrw9Oe9YaKHpJM9_Ts_TFReIjzJDnM_QkQrW93UnL05aTugNlUoHkWkzQ9UJEnW060OAZke5hVfRKfn2B8pgAgv3GXXPLD-ntVAH0meWZDxUSnPl79D2vHgeQs7mAqZBw0T54hUr0kEecPhwod",
  illustrationAlt = "Fonoaudióloga com sorriso acolhedor interagindo com tablet",
  tagline = "Boas-vindas",
  headline = (
    <>
      Sua jornada
      <br />
      começa agora.
    </>
  ),
  floatingBadges = defaultFloatingBadges,
  className,
}: OnboardingSidebarProps) {
  return (
    <div
      className={cn(
        "hidden md:flex md:w-1/2 h-full bg-gradient-evolua relative flex-col p-12 justify-between overflow-hidden",
        className
      )}
    >
      {/* Logo */}
      <div className="z-10 flex items-center gap-3 text-primary">
        <div className="size-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-purple-200">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-4 text-primary-foreground"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Evolua</h2>
      </div>

      {/* Background Effects & Illustration */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        {/* Blurred background circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-100/40 rounded-full blur-[60px]" />

        {/* Main illustration container */}
        <div className="relative w-full h-full flex items-center justify-center p-20">
          <div
            className="w-full h-full bg-center bg-contain bg-no-repeat"
            style={{ backgroundImage: `url("${illustration}")` }}
            role="img"
            aria-label={illustrationAlt}
          />

          {/* Floating Badges */}
          {floatingBadges.map((badge, index) => (
            <FloatingBadge
              key={index}
              icon={badge.icon}
              label={badge.label}
              iconBgClassName={badge.iconBgClassName}
              className={badge.className}
              animationDuration={badge.animationDuration}
              animationDelay={badge.animationDelay}
            />
          ))}
        </div>
      </div>

      {/* Footer Text */}
      <div className="z-10 relative">
        <p className="text-primary/80 text-sm font-bold tracking-widest uppercase mb-2">
          {tagline}
        </p>
        <h3 className="text-3xl font-bold text-slate-900 leading-tight">
          {headline}
        </h3>
      </div>
    </div>
  )
}
