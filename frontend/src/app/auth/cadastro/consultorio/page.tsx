"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Network,
  Laptop,
  Clock,
  Users,
  Video,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  OnboardingLayout,
  OnboardingProgress,
  OnboardingHeader,
  OnboardingMobileProgress,
  GlassCard,
} from "@/components/onboarding"
import { OnboardingFormField } from "@/components/onboarding/onboarding-form-field"
import { OnboardingRadioCard } from "@/components/onboarding/onboarding-radio-card"
import { OnboardingChipRadio } from "@/components/onboarding/onboarding-chip-radio"
import { OnboardingRadioOption } from "@/components/onboarding/onboarding-radio-option"

const CURRENT_STEP = 4
const TOTAL_STEPS = 6

const ROUTINE_OPTIONS = [
  {
    id: "presencial",
    icon: <Building2 className="size-7" />,
    label: (
      <>
        100%
        <br />
        Presencial
      </>
    ),
  },
  {
    id: "hibrido",
    icon: <Network className="size-7" />,
    label: (
      <>
        Híbrido
        <br />
        (Online + Pres.)
      </>
    ),
  },
  {
    id: "online",
    icon: <Laptop className="size-7" />,
    label: (
      <>
        100%
        <br />
        Online
      </>
    ),
  },
]

const PATIENT_COUNT_OPTIONS = [
  { id: "1-10", label: "1 - 10 pacientes" },
  { id: "11-30", label: "11 - 30 pacientes" },
  { id: "30+", label: "30+ pacientes" },
]

const TEAM_OPTIONS = [
  { id: "sozinha", label: "Trabalho sozinha" },
  { id: "equipe", label: "Tenho equipe/sócios" },
]

export default function ConsultorioPage() {
  const router = useRouter()
  const [routine, setRoutine] = useState("presencial")
  const [patientCount, setPatientCount] = useState<string | null>(null)
  const [team, setTeam] = useState("sozinha")

  const handleBack = () => {
    router.push("/auth/cadastro/atuacao")
  }

  const handleContinue = () => {
    router.push("/auth/cadastro/objetivos")
  }

  return (
    <OnboardingLayout
      currentStep={CURRENT_STEP}
      totalSteps={TOTAL_STEPS}
      tagline="Personalização"
      headline={
        <>
          Adapte a plataforma
          <br />
          ao seu ritmo.
        </>
      }
      floatingBadges={[
        {
          icon: <Video className="size-3.5 text-green-600" />,
          label: "Online",
          iconBgClassName: "bg-green-100",
          className: "absolute top-[28%] right-[18%]",
          animationDuration: "4s",
        },
        {
          icon: <MapPin className="size-3.5 text-[#8A05BE]" />,
          label: "Presencial",
          iconBgClassName: "bg-[#8A05BE]/10",
          className: "absolute bottom-[28%] left-[18%]",
          animationDuration: "6s",
          animationDelay: "2s",
        },
      ]}
    >
      {/* Progress Bar - Desktop */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

      {/* Header */}
      <OnboardingHeader
        title="Como é o seu ambiente de trabalho? Vamos ajustar a Evolua para ele. 🏡"
        description="Entender sua dinâmica nos ajuda a configurar a plataforma para que ela se adapte perfeitamente ao seu ritmo e equipe."
      />

      {/* Form Card */}
      <GlassCard className="text-left items-stretch gap-8">
        {/* Routine Selection */}
        <OnboardingFormField
          label="Rotina de Atendimentos"
          icon={<Clock className="size-4" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {ROUTINE_OPTIONS.map((option) => (
              <OnboardingRadioCard
                key={option.id}
                icon={option.icon}
                label={option.label}
                selected={routine === option.id}
                onClick={() => setRoutine(option.id)}
              />
            ))}
          </div>
        </OnboardingFormField>

        {/* Patient Count Selection */}
        <OnboardingFormField
          label="Pacientes por semana"
          icon={<Users className="size-4" />}
        >
          <div className="flex flex-wrap gap-3 mt-2">
            {PATIENT_COUNT_OPTIONS.map((option) => (
              <OnboardingChipRadio
                key={option.id}
                label={option.label}
                selected={patientCount === option.id}
                onClick={() => setPatientCount(option.id)}
              />
            ))}
          </div>
        </OnboardingFormField>

        {/* Team Structure Selection */}
        <OnboardingFormField
          label="Estrutura"
          icon={<Users className="size-4" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {TEAM_OPTIONS.map((option) => (
              <OnboardingRadioOption
                key={option.id}
                label={option.label}
                selected={team === option.id}
                onClick={() => setTeam(option.id)}
              />
            ))}
          </div>
        </OnboardingFormField>
      </GlassCard>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="font-semibold py-4 px-8 rounded-full border-2 border-slate-200 hover:border-[#8A05BE]/30 hover:bg-[#8A05BE]/5 flex items-center gap-2 text-base h-auto transition-all duration-300"
        >
          <ArrowLeft className="size-5" />
          Voltar
        </Button>
        <Button
          onClick={handleContinue}
          size="lg"
          className="bg-[#8A05BE] hover:bg-[#8A05BE]/90 text-white font-bold py-4 px-10 rounded-full shadow-[0_8px_25px_rgba(138,5,190,0.3)] hover:shadow-[0_10px_30px_rgba(138,5,190,0.5)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 text-lg h-auto"
        >
          Continuar
          <ArrowRight className="size-5" />
        </Button>
      </div>

      {/* Mobile Progress Dots */}
      <OnboardingMobileProgress
        currentStep={CURRENT_STEP}
        totalSteps={TOTAL_STEPS}
      />
    </OnboardingLayout>
  )
}
