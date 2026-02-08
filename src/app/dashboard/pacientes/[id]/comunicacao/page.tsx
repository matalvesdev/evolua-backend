"use client"

import { use } from "react"
import Link from "next/link"
import {
  CommunicationHeader,
  CommunicationFilterBar,
  CommunicationTimeline,
} from "@/components/patient-communication"

interface CommunicationPageProps {
  params: Promise<{ id: string }>
}

export default function CommunicationPage({ params }: CommunicationPageProps) {
  const { id } = use(params)

  // Mock data - substituir por dados reais do Supabase
  const patient = {
    name: "Ana Clara Souza",
    image: "",
    guardianName: "Mariana Souza",
    guardianRelationship: "Mãe",
    age: 6,
    status: "active" as const,
  }

  const timelineGroups = [
    {
      date: "2023-10-12",
      label: "Hoje, 12 Outubro",
      isToday: true,
      communications: [
        {
          id: "1",
          type: "whatsapp" as const,
          sender: "WhatsApp (Mariana)",
          status: "sent" as const,
          time: "10:42",
          message:
            "Olá Mariana, bom dia! Gostaria de saber se a Ana conseguiu realizar os exercícios de sopro que combinamos na última sessão. Tiveram alguma dificuldade?",
          author: "Dra. Julia",
          readTime: "11:15",
        },
      ],
    },
    {
      date: "2023-10-11",
      label: "Ontem, 11 Outubro",
      isToday: false,
      communications: [
        {
          id: "2",
          type: "sms" as const,
          sender: "Lembrete Automático (SMS)",
          status: "system" as const,
          time: "09:00",
          message:
            '"Olá! Lembrete da sessão de fonoaudiologia de Ana Clara amanhã (12/10) às 14h na Clínica Evolua. Responda SIM para confirmar."',
          isSystemMessage: true,
        },
      ],
    },
    {
      date: "2023-10-05",
      label: "Semana Passada",
      isToday: false,
      communications: [
        {
          id: "3",
          type: "email" as const,
          sender: "Relatório Mensal (E-mail)",
          status: "sent" as const,
          time: "05 Out, 16:30",
          message:
            "Envio do relatório de progresso referente ao mês de Setembro. Documento PDF anexado.",
          attachment: {
            name: "Relatorio_Setembro_AnaClara.pdf",
            icon: "picture_as_pdf",
          },
        },
        {
          id: "4",
          type: "received" as const,
          sender: "WhatsApp (Mariana)",
          status: "received" as const,
          time: "03 Out, 14:20",
          message:
            '"Dra. Julia, a Ana Clara adorou a sessão de hoje! Ela chegou em casa repetindo as palavras que aprenderam. Obrigada!"',
          isReceived: true,
        },
      ],
    },
  ]

  const handleCall = () => {
    console.log("Iniciando chamada...")
  }

  const handleWhatsApp = () => {
    console.log("Abrindo WhatsApp...")
  }

  const handleEmail = () => {
    console.log("Abrindo email...")
  }

  const handleFilterChange = (filter: "all" | "manual" | "auto") => {
    console.log("Filtro alterado:", filter)
  }

  const handleNewMessage = () => {
    console.log("Nova mensagem...")
  }

  const handleLoadMore = () => {
    console.log("Carregar mais comunicações...")
  }

  return (
    <div className="relative min-h-screen bg-[#f7f6f8]">
      {/* Gradient Orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#8A05BE]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-8 pb-20">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link
            href={`/dashboard/pacientes/${id}`}
            className="hover:text-[#8A05BE] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar para Perfil
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900">Histórico de Comunicação</span>
        </div>

        <div className="flex flex-col gap-6">
          {/* Header */}
          <CommunicationHeader
            patientName={patient.name}
            patientImage={patient.image}
            guardianName={patient.guardianName}
            guardianRelationship={patient.guardianRelationship}
            age={patient.age}
            status={patient.status}
            onCall={handleCall}
            onWhatsApp={handleWhatsApp}
            onEmail={handleEmail}
          />

          {/* Timeline */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 min-h-[600px] relative overflow-hidden flex flex-col border border-white bg-white/90 backdrop-blur-md shadow-lg">
            <CommunicationFilterBar
              onFilterChange={handleFilterChange}
              onNewMessage={handleNewMessage}
            />

            <CommunicationTimeline groups={timelineGroups} onLoadMore={handleLoadMore} />
          </section>
        </div>
      </div>
    </div>
  )
}
