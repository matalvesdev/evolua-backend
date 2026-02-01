"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { AudioRecorderPanel } from "@/components/audio-recorder"

interface NewReportPageProps {
  params: Promise<{ id: string }>
}

export default function NewReportPage({ params }: NewReportPageProps) {
  const { id } = use(params)
  const router = useRouter()

  // Mock data - substituir por dados reais do Supabase
  const patientName = "Ana Souza"

  const handleBack = () => {
    router.back()
  }

  const handleSave = (audioBlob: Blob, duration: number) => {
    console.log("Salvando áudio:", { audioBlob, duration })
    // Implementar salvamento no Supabase
    // 1. Upload do arquivo de áudio
    // 2. Enviar para processamento de IA
    // 3. Salvar relatório gerado
  }

  const handleCancel = () => {
    router.push(`/dashboard/pacientes/${id}`)
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col md:flex-row bg-[#F9F8FA]">
      {/* Left Panel - Illustration */}
      <section className="relative w-full md:w-1/2 h-1/3 md:h-full bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 overflow-hidden flex items-center justify-center p-8">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-300/30 rounded-full blur-[80px]" />

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center md:items-start md:text-left gap-6">
          <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-xl border border-white/40 bg-white/20 backdrop-blur-sm">
            <div
              className="w-full h-full bg-center bg-cover"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDBFeqDAdUO0uJ-ajqPTEPa9CAXfxsSQg-L9JNlLj7Qy9Sp5djMgF-AphZgtNFEI8z5jKTEXbp1r7qx7AdQd2vNuznbyG8AfPRXpiQbuzwKbJYznq9HmLCxwQVT_MYlwa6xVwTsRIEo5GfOXmzQZrj1vCjnSlkr-QnCRTWl6X4J2627yr7-EFc36bWjiTprB7qGXm8upIIhEc1xKzk2aaQp_etne_yMkwumBduYu7pGJ-3ojLshtEat21D6OkgfXsCF_LXW5tFkNiNd')",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900 via-transparent to-transparent opacity-90" />
            </div>
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <h2 className="text-3xl font-bold mb-2 leading-tight">Fluxo Criativo</h2>
              <p className="text-white/90 text-lg font-normal">
                Transforme sua voz em relatórios estruturados instantaneamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Panel - Recorder */}
      <section className="relative w-full md:w-1/2 h-2/3 md:h-full flex flex-col items-center justify-center p-4 md:p-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-multiply" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-[#820AD1]/5 rounded-full blur-[150px] pointer-events-none" />

        <AudioRecorderPanel
          patientName={patientName}
          onBack={handleBack}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </section>
    </div>
  )
}
