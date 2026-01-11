"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, User, Mail, Smartphone, Lock, ShieldCheck, MailCheck } from "lucide-react"
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

const CURRENT_STEP = 2
const TOTAL_STEPS = 6

export default function DadosPessoaisPage() {
  const router = useRouter()

  const handleContinue = () => {
    router.push("/auth/cadastro/atuacao")
  }

  return (
    <OnboardingLayout
      currentStep={CURRENT_STEP}
      totalSteps={TOTAL_STEPS}
      tagline="Segurança"
      headline={
        <>
          Seus dados com
          <br />
          o carinho que merecem.
        </>
      }
      illustration="https://lh3.googleusercontent.com/aida-public/AB6AXuA7Tz1F-gvqE0zMBJPmXlmqQW21Oga_xcfQDbz1-OPC1zw8UV5yc_kK_HyB4OZ_Mn19wysklcMhKuZQaF6_9UO6fGR3cVun_RGJKGX4lxqiEANsWhPV1w_LEbz5a05hj0bP_do03-oNqwtDV4SDdSF3Qr0eBJap3r49lDfVzb0RqQiyADbQOg4W0kfLJQfmDDxgZAU0o9F_U8s9lc9Tpnr2D1MsNtsdUps2MVv3XQCf4Ls7BS3UFnoYYq_s5wVMeK8KP-9DMNsNqFek"
      illustrationAlt="Speech therapist with gentle expression typing on a laptop in a modern environment"
      floatingBadges={[
        {
          icon: <Lock className="size-3.5 text-blue-600" />,
          label: "100% Seguro",
          iconBgClassName: "bg-blue-100",
          className: "absolute top-[25%] right-[20%]",
          animationDuration: "4s",
        },
        {
          icon: <ShieldCheck className="size-3.5 text-primary" />,
          label: "Dados Protegidos",
          iconBgClassName: "bg-purple-100",
          className: "absolute bottom-[30%] left-[15%]",
          animationDuration: "5s",
          animationDelay: "1s",
        },
        {
          icon: <MailCheck className="size-3.5 text-pink-500" />,
          label: "Contato Verificado",
          iconBgClassName: "bg-pink-100",
          className: "absolute top-[60%] right-[10%]",
          animationDuration: "6s",
          animationDelay: "0.5s",
        },
      ]}
    >
      {/* Progress Bar - Desktop */}
      <OnboardingProgress currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

      {/* Header */}
      <OnboardingHeader
        title="Vamos começar com o básico! Como podemos te chamar e te encontrar?"
        description="Seu nome e contato são o ponto de partida para sua conta segura e personalizada. Tudo será tratado com o carinho e a discrição que você merece."
      />

      {/* Form Card */}
      <GlassCard className="text-left items-stretch">
        <OnboardingFormField
          label="Nome Completo"
          icon={<User className="size-4" />}
        >
          <OnboardingInput
            id="name"
            type="text"
            placeholder="Digite seu nome completo"
          />
        </OnboardingFormField>

        <OnboardingFormField
          label="E-mail Profissional"
          icon={<Mail className="size-4" />}
          hint="Enviaremos um código de confirmação para este e-mail."
        >
          <OnboardingInput
            id="email"
            type="email"
            placeholder="seu.email@exemplo.com"
          />
        </OnboardingFormField>

        <OnboardingFormField
          label="WhatsApp / Celular"
          icon={<Smartphone className="size-4" />}
        >
          <div className="flex gap-3">
            <div className="w-24 shrink-0">
              <OnboardingInput
                type="text"
                value="+55"
                readOnly
                className="bg-slate-50 text-center font-medium"
              />
            </div>
            <OnboardingInput
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
            />
          </div>
        </OnboardingFormField>
      </GlassCard>

      {/* Continue Button */}
      <div className="mt-8 flex justify-end">
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
