"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowLeft,
  Baby,
  Brain,
  Mic,
  Ear,
  Smile,
  UserRound,
  LayoutGrid,
  PenLine,
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
import { OnboardingInput } from "@/components/onboarding/onboarding-input"
import { OnboardingCheckboxCard } from "@/components/onboarding/onboarding-checkbox-card"

const CURRENT_STEP = 3
const TOTAL_STEPS = 6

const SPECIALTIES = [
  {
    id: "infantil",
    icon: <Baby className="size-7" />,
    label: (
      <>
        Infantil /<br />
        Linguagem
      </>
    ),
  },
  {
    id: "neuro",
    icon: <Brain className="size-7" />,
    label: (
      <>
        Neuro /<br />
        TEA & CAA
      </>
    ),
  },
  {
    id: "voz",
    icon: <Mic className="size-7" />,
    label: (
      <>
        Voz &<br />
        Disfonia
      </>
    ),
  },
  {
    id: "audiologia",
    icon: <Ear className="size-7" />,
    label: (
      <>
        Audiologia
        <br />
        Clínica
      </>
    ),
  },
  {
    id: "motricidade",
    icon: <Smile className="size-7" />,
    label: (
      <>
        Motricidade
        <br />
        Orofacial
      </>
    ),
  },
  {
    id: "adulto",
    icon: <UserRound className="size-7" />,
    label: (
      <>
        Adulto /<br />
        Geriatria
      </>
    ),
  },
]

export default function AtuacaoPage() {
  const router = useRouter()
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    "infantil",
  ])
  const [otherSpecialty, setOtherSpecialty] = useState("")

  const handleSpecialtyChange = (id: string, checked: boolean) => {
    setSelectedSpecialties((prev) =>
      checked ? [...prev, id] : prev.filter((s) => s !== id)
    )
  }

  const handleBack = () => {
    router.push("/auth/cadastro/dados-pessoais")
  }

  const handleContinue = () => {
    router.push("/auth/cadastro/consultorio")
  }

  return (
    <OnboardingLayout
      currentStep={CURRENT_STEP}
      totalSteps={TOTAL_STEPS}
      tagline="Especialidade"
      headline={
        <>
          Conteúdos sob medida
          <br />
          para sua atuação.
        </>
      }
      floatingBadges={[
        {
          icon: <Brain className="size-3.5 text-indigo-600" />,
          label: "TEA / CAA",
          iconBgClassName: "bg-indigo-100",
          className: "absolute top-[28%] right-[20%]",
          animationDuration: "4s",
        },
        {
          icon: <Baby className="size-3.5 text-pink-500" />,
          label: "Infantil",
          iconBgClassName: "bg-pink-100",
          className: "absolute bottom-[35%] left-[20%]",
          animationDuration: "5s",
          animationDelay: "1s",
        },
        {
          icon: <Ear className="size-3.5 text-amber-600" />,
          label: "Audiologia",
          iconBgClassName: "bg-amber-100",
          className: "absolute top-[50%] left-[15%]",
          animationDuration: "6s",
          animationDelay: "0.5s",
        },
      ]}
    >
      {/* Progress Bar - Desktop */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

      {/* Header */}
      <OnboardingHeader
        title="Para quem você dedica sua paixão? Conte-nos sobre sua especialidade."
        description="Sua área de atuação é a chave para a Evolua te sugerir as ferramentas mais adequadas e conteúdos sob medida. ✨"
      />

      {/* Form Card */}
      <GlassCard className="text-left items-stretch gap-8">
        {/* Specialty Selection */}
        <OnboardingFormField
          label="Principais Áreas de Atuação"
          icon={<LayoutGrid className="size-4" />}
          hint="Selecione todas que se aplicam"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {SPECIALTIES.map((specialty) => (
              <OnboardingCheckboxCard
                key={specialty.id}
                icon={specialty.icon}
                label={specialty.label}
                checked={selectedSpecialties.includes(specialty.id)}
                onChange={(checked) =>
                  handleSpecialtyChange(specialty.id, checked)
                }
              />
            ))}
          </div>
        </OnboardingFormField>

        {/* Other Specialty Input */}
        <OnboardingFormField
          label="Outra ou foco específico"
          icon={<PenLine className="size-4" />}
        >
          <OnboardingInput
            id="other-specialty"
            type="text"
            placeholder="Ex: Foco em gagueira, processamento auditivo..."
            value={otherSpecialty}
            onChange={(e) => setOtherSpecialty(e.target.value)}
          />
        </OnboardingFormField>
      </GlassCard>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="font-semibold py-4 px-8 rounded-full border-2 border-slate-200 hover:border-primary/30 hover:bg-primary/5 flex items-center gap-2 text-base h-auto transition-all duration-300"
        >
          <ArrowLeft className="size-5" />
          Voltar
        </Button>
        <Button
          onClick={handleContinue}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-10 rounded-full shadow-[0_8px_25px_rgba(164,19,236,0.3)] hover:shadow-[0_10px_30px_rgba(164,19,236,0.5)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 text-lg h-auto"
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
