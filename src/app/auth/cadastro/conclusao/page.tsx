"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Rocket,
  ArrowLeft,
  Camera,
  Search,
  Users,
  Mic,
  MoreHorizontal,
  Megaphone,
  CheckCircle,
  LayoutDashboard,
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
import { OnboardingRadioChipWithIcon } from "@/components/onboarding/onboarding-radio-chip-with-icon"
import { OnboardingTermsCheckbox } from "@/components/onboarding/onboarding-terms-checkbox"
import { registerAction } from "@/actions/auth.actions"

const CURRENT_STEP = 6
const TOTAL_STEPS = 6

const REFERRAL_OPTIONS = [
  {
    id: "instagram",
    icon: <Camera className="size-5" />,
    label: "Instagram / Facebook",
  },
  {
    id: "google",
    icon: <Search className="size-5" />,
    label: "Google / Pesquisa",
  },
  {
    id: "indicacao",
    icon: <Users className="size-5" />,
    label: "Indicação de Colega",
  },
  {
    id: "evento",
    icon: <Mic className="size-5" />,
    label: "Evento / Congresso",
  },
  {
    id: "outro",
    icon: <MoreHorizontal className="size-5" />,
    label: "Outro",
    fullWidth: true,
  },
]

export default function ConclusaoPage() {
  const router = useRouter()
  const [referral, setReferral] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBack = () => {
    router.push("/auth/cadastro/objetivos")
  }

  const handleFinish = async () => {
    if (!termsAccepted) {
      setError("Você precisa aceitar os termos de uso para continuar")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      // Recuperar dados do localStorage
      const onboardingDataStr = localStorage.getItem("onboarding_data")
      
      if (!onboardingDataStr) {
        setError("Dados do cadastro não encontrados. Por favor, volte e preencha os dados pessoais.")
        setIsLoading(false)
        return
      }

      const onboardingData = JSON.parse(onboardingDataStr)

      // Validar dados obrigatórios
      if (!onboardingData.email || !onboardingData.password || !onboardingData.full_name) {
        setError("Dados obrigatórios não foram preenchidos. Por favor, volte e complete o cadastro.")
        setIsLoading(false)
        return
      }

      console.log("Criando conta com os dados:", {
        name: onboardingData.full_name,
        email: onboardingData.email,
        phone: onboardingData.phone,
      })

      // Criar conta no Supabase
      const result = await registerAction({
        name: onboardingData.full_name,
        email: onboardingData.email,
        password: onboardingData.password,
      })

      if (!result.success) {
        setError(result.error || "Erro ao criar conta")
        setIsLoading(false)
        return
      }

      console.log("Conta criada com sucesso:", result.data)

      // Limpar localStorage
      localStorage.removeItem("onboarding_data")

      // Redirecionar para o dashboard
      window.location.href = "/dashboard"
    } catch (err) {
      console.error("Erro ao criar conta:", err)
      setError("Erro ao criar conta. Por favor, tente novamente.")
      setIsLoading(false)
    }
  }

  return (
    <OnboardingLayout
      currentStep={CURRENT_STEP}
      totalSteps={TOTAL_STEPS}
      tagline="Tudo Pronto"
      headline={
        <>
          Sua jornada de sucesso
          <br />
          começa agora.
        </>
      }
      floatingBadges={[
        {
          icon: <CheckCircle className="size-3.5 text-green-600" />,
          label: "100% Configurado",
          iconBgClassName: "bg-green-100",
          className: "absolute top-[25%] right-[20%]",
          animationDuration: "4.5s",
        },
        {
          icon: <LayoutDashboard className="size-3.5 text-primary" />,
          label: "Seu Espaço Pronto",
          iconBgClassName: "bg-primary/10",
          className: "absolute bottom-[25%] left-[20%]",
          animationDuration: "5.5s",
          animationDelay: "1.5s",
        },
      ]}
    >
      {/* Progress Bar - Desktop */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

      {/* Header */}
      <OnboardingHeader
        title="Quase lá! Sua Evolua está sendo configurada com carinho. 🚀"
        description="Com as suas respostas, pudemos personalizar sua Evolua. Prepare-se para um sistema que entende você e simplifica sua rotina! Um último passo antes de você entrar:"
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Form Card */}
      <GlassCard className="text-left items-stretch gap-8">
        {/* Referral Selection */}
        <OnboardingFormField
          label="Como você conheceu a Evolua?"
          icon={<Megaphone className="size-4" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {REFERRAL_OPTIONS.map((option) => (
              <OnboardingRadioChipWithIcon
                key={option.id}
                icon={option.icon}
                label={option.label}
                selected={referral === option.id}
                onClick={() => setReferral(option.id)}
                className={option.fullWidth ? "sm:col-span-2" : ""}
              />
            ))}
          </div>
        </OnboardingFormField>

        {/* Terms Checkbox */}
        <div className="pt-2 border-t border-slate-100">
          <OnboardingTermsCheckbox
            checked={termsAccepted}
            onChange={setTermsAccepted}
          >
            Li e concordo com os{" "}
            <a
              href="#"
              className="text-primary font-bold hover:underline decoration-2 underline-offset-2"
            >
              Termos de Uso
            </a>{" "}
            e{" "}
            <a
              href="#"
              className="text-primary font-bold hover:underline decoration-2 underline-offset-2"
            >
              Política de Privacidade
            </a>{" "}
            da Evolua.
          </OnboardingTermsCheckbox>
        </div>
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
          onClick={handleFinish}
          disabled={!termsAccepted || isLoading}
          size="lg"
          className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-8 md:px-10 rounded-full shadow-[0_8px_25px_rgba(164,19,236,0.3)] hover:shadow-[0_10px_30px_rgba(164,19,236,0.5)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 text-lg h-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? "Criando sua conta..." : "Acessar Meu Dashboard Personalizado"}
          <Rocket className="size-5" />
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
