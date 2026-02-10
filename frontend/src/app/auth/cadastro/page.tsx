"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, HandMetal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  OnboardingLayout,
  OnboardingProgress,
  OnboardingHeader,
  OnboardingMobileProgress,
  GlassCard,
} from "@/components/onboarding"

const CURRENT_STEP = 1
const TOTAL_STEPS = 6

export default function WelcomePage() {
  const router = useRouter()

  const handleStart = () => {
    router.push("/auth/cadastro/dados-pessoais")
  }

  return (
    <OnboardingLayout
      currentStep={CURRENT_STEP}
      totalSteps={TOTAL_STEPS}
      tagline="Boas-vindas"
      headline={
        <>
          Sua jornada
          <br />
          começa agora.
        </>
      }
    >
      {/* Progress Bar - Desktop */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

      {/* Header */}
      <OnboardingHeader
        title="Bem-vinda à Evolua! Pronta para uma experiência feita para você?"
        description="Que alegria ter você conosco! Para que a Evolua seja perfeita para sua rotina, vamos conhecer um pouco mais sobre sua atuação. Levará só um instante!"
        emoji="💜"
      />

      {/* Glass Card */}
      <GlassCard>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-[#8A05BE]/10 rounded-full mb-2">
            <HandMetal className="size-9 text-[#8A05BE]" />
          </div>
          <p className="text-muted-foreground font-medium max-w-sm">
            Vamos configurar seu ambiente de trabalho ideal em poucos passos.
          </p>
        </div>

        <Button
          onClick={handleStart}
          size="lg"
          className="w-full md:w-auto bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white font-bold py-4 px-10 rounded-full shadow-[0_8px_25px_rgba(138,5,190,0.3)] hover:shadow-[0_10px_30px_rgba(138,5,190,0.5)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-lg h-auto"
        >
          Começar minha jornada Evolua
          <ArrowRight className="size-5" />
        </Button>
      </GlassCard>

      {/* Mobile Progress Dots */}
      <OnboardingMobileProgress
        currentStep={CURRENT_STEP}
        totalSteps={TOTAL_STEPS}
      />
    </OnboardingLayout>
  )
}
