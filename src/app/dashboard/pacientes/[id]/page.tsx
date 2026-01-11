"use client"

import { use } from "react"
import {
  ProfileHeader,
  PatientInfoCard,
  DocumentsSection,
  CommunicationHistory,
  NextSessionCard,
  SmartActionsCard,
  StatusCard
} from "@/components/patient-profile"

interface PatientProfilePageProps {
  params: Promise<{ id: string }>
}

export default function PatientProfilePage({ params }: PatientProfilePageProps) {
  const { id } = use(params)

  // Mock data - substituir por dados reais do Supabase
  const patientData = {
    name: "Ana Clara Souza",
    age: 5,
    birthdate: "12/05/2019",
    education: "Pré-escola",
    therapyPlan: "Terapia de Linguagem (Foco em Fonética)",
    guardian: {
      name: "Mariana Souza",
      relationship: "Mãe",
      phone: "(11) 99999-8888"
    },
    lastSession: {
      date: "10 Out",
      time: "14:00",
      status: "Realizada"
    },
    status: "active" as const
  }

  return (
    <div className="relative min-h-screen">
      {/* Gradient Orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8 pb-24">
        {/* Header */}
        <ProfileHeader patientName={patientData.name} status={patientData.status} />

        {/* Patient Info Card */}
        <PatientInfoCard patientData={patientData} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <DocumentsSection />
            <CommunicationHistory />
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <NextSessionCard
              date="15 Out"
              day="Terça-feira"
              time="14:00"
            />
            <SmartActionsCard />
            <StatusCard />
          </div>
        </div>
      </div>
    </div>
  )
}
