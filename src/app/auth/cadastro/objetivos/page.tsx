"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  FileText,
  DollarSign,
  UserX,
  AlertCircle,
  Star,
  MessageCircle,
  CalendarCheck,
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
import { OnboardingRadioWithIcon } from "@/components/onboarding/onboarding-radio-with-icon"
import { OnboardingChipCheckbox } from "@/components/onboarding/onboarding-chip-checkbox"
import { OnboardingTextarea } from "@/components/onboarding/onboarding-textarea"

const CURRENT_STEP = 5
const TOTAL_STEPS = 6

const CHALLENGE_OPTIONS = [
  {
    id: "agenda",
    icon: <CalendarDays className="size-6" />,
    label: "Agenda Caótica",
  },
  {
    id: "papelada",
    icon: <FileText className="size-6" />,
    label: "Papelada Excessiva",
  },
  {
    id: "financeiro",
    icon: <DollarSign className="size-6" />,
    label: "Controle Financeiro",
  },
  {
    id: "faltas",
    icon: <UserX className="size-6" />,
    label: "Faltas de Pacientes",
  },
]

const PRIORITY_OPTIONS = [
  { id: "organizacao", label: "Organização Geral" },
  { id: "tempo", label: "Ganhar Tempo" },
  { id: "prontuarios", label: "Digitalizar Prontuários" },
  { id: "faturamento", label: "Melhorar Faturamento" },
]

export default function ObjetivosPage() {
  const router = useRouter()
  const [challenge, setChallenge] = useState("agenda")
  const [priorities, setPriorities] = useState<string[]>(["organizacao"])
  const [additionalDetails, setAdditionalDetails] = useState("")

  const handlePriorityChange = (id: string, checked: boolean) => {
    setPriorities((prev) =>
      checked ? [...prev, id] : prev.filter((p) => p !== id)
    )
  }

  const handleBack = () => {
    router.push("/auth/cadastro/consultorio")
  }

  const handleContinue = () => {
    router.push("/auth/cadastro/conclusao")
  }

  return (
    <OnboardingLayout
      currentStep={CURRENT_STEP}
      totalSteps={TOTAL_STEPS}
      tagline="Transformação"
      headline={
        <>
          Supere desafios,
          <br />
          foque no que importa.
        </>
      }
      floatingBadges={[
        {
          icon: <FileText className="size-3.5 text-[#8A05BE]" />,
          label: "Relatórios Digitais",
          iconBgClassName: "bg-[#8A05BE]/10",
          className: "absolute top-[25%] right-[20%]",
          animationDuration: "4.5s",
        },
        {
          icon: <CalendarCheck className="size-3.5 text-[#8A05BE]" />,
          label: "Agenda Otimizada",
          iconBgClassName: "bg-[#8A05BE]/10",
          className: "absolute bottom-[30%] left-[18%]",
          animationDuration: "5.5s",
          animationDelay: "1.5s",
        },
      ]}
    >
      {/* Progress Bar - Desktop */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

      {/* Header */}
      <OnboardingHeader
        title="Qual a sua maior dor hoje? E o que a Evolua pode fazer por você?"
        description="Queremos ser sua aliada na superação dos desafios. Conte-nos o que mais te preocupa na gestão e sua necessidade prioritária. 🌟"
      />

      {/* Form Card */}
      <GlassCard className="text-left items-stretch gap-8">
        {/* Challenge Selection */}
        <OnboardingFormField
          label="Maior desafio atual"
          icon={<AlertCircle className="size-4" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {CHALLENGE_OPTIONS.map((option) => (
              <OnboardingRadioWithIcon
                key={option.id}
                icon={option.icon}
                label={option.label}
                selected={challenge === option.id}
                onClick={() => setChallenge(option.id)}
              />
            ))}
          </div>
        </OnboardingFormField>

        {/* Priority Selection */}
        <OnboardingFormField
          label="Prioridade com a Evolua"
          icon={<Star className="size-4" />}
        >
          <div className="flex flex-wrap gap-2 mt-2">
            {PRIORITY_OPTIONS.map((option) => (
              <OnboardingChipCheckbox
                key={option.id}
                label={option.label}
                checked={priorities.includes(option.id)}
                onChange={(checked) =>
                  handlePriorityChange(option.id, checked)
                }
              />
            ))}
          </div>
        </OnboardingFormField>

        {/* Additional Details */}
        <OnboardingFormField
          label="Detalhes adicionais (Opcional)"
          icon={<MessageCircle className="size-4" />}
        >
          <OnboardingTextarea
            placeholder="Conte um pouco mais sobre o que você busca..."
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
          />
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
