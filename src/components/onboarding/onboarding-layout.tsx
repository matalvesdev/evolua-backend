"use client"

import { cn } from "@/lib/utils"
import { OnboardingSidebar } from "./onboarding-sidebar"
import { OnboardingMobileHeader } from "./onboarding-mobile-header"

interface FloatingBadgeConfig {
  icon: React.ReactNode
  label: string
  iconBgClassName?: string
  className?: string
  animationDuration?: string
  animationDelay?: string
}

interface OnboardingLayoutProps {
  children: React.ReactNode
  illustration?: string
  illustrationAlt?: string
  tagline?: string
  headline?: React.ReactNode
  floatingBadges?: FloatingBadgeConfig[]
  currentStep?: number
  totalSteps?: number
  className?: string
}

export function OnboardingLayout({
  children,
  illustration,
  illustrationAlt,
  tagline,
  headline,
  floatingBadges,
  currentStep = 1,
  totalSteps = 6,
  className,
}: OnboardingLayoutProps) {
  return (
    <div
      className={cn(
        "bg-background font-sans text-foreground overflow-hidden h-screen w-screen flex flex-col md:flex-row",
        className
      )}
    >
      {/* Left Sidebar - Desktop Only */}
      <OnboardingSidebar
        illustration={illustration}
        illustrationAlt={illustrationAlt}
        tagline={tagline}
        headline={headline}
        floatingBadges={floatingBadges}
      />

      {/* Right Content Area */}
      <div className="w-full md:w-1/2 h-full relative flex flex-col overflow-y-auto bg-background">
        {/* Mobile Header */}
        <OnboardingMobileHeader
          currentStep={currentStep}
          totalSteps={totalSteps}
        />

        {/* Content */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-6 md:p-12 lg:p-16 justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}
