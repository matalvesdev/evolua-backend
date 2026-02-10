"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import {
  CommunicationHeader,
  CommunicationFilterBar,
  CommunicationTimeline,
} from "@/components/patient-communication"
import { WhatsAppMessageModal } from "@/components/whatsapp/whatsapp-message-modal"
import { usePatient, useAppointments } from "@/hooks"
import { useMessages } from "@/hooks/use-messages"
import type { Message } from "@/lib/api/messages"

interface CommunicationPageProps {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// Helpers — transform Message[] → TimelineGroup[]
// ---------------------------------------------------------------------------

const TEMPLATE_LABELS: Record<string, string> = {
  reminder: "Lembrete",
  activity: "Atividade",
  feedback: "Feedback",
  free: "Mensagem",
}

function formatGroupLabel(dateStr: string, isToday: boolean, isYesterday: boolean): string {
  if (isToday) {
    const d = new Date(dateStr)
    return `Hoje, ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`
  }
  if (isYesterday) {
    const d = new Date(dateStr)
    return `Ontem, ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`
  }
  const d = new Date(dateStr)
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function messagesToTimelineGroups(messages: Message[]) {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const grouped = new Map<string, Message[]>()

  for (const msg of messages) {
    const d = new Date(msg.sentAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(msg)
  }

  const groups = Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, msgs]) => {
      const dateObj = new Date(dateKey + "T00:00:00")
      const isToday = isSameDay(dateObj, now)
      const isYesterday = isSameDay(dateObj, yesterday)

      return {
        date: dateKey,
        label: formatGroupLabel(dateKey, isToday, isYesterday),
        isToday,
        communications: msgs
          .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
          .map((msg) => ({
            id: msg.id,
            type: "whatsapp" as const,
            sender: `WhatsApp (${msg.recipientName})`,
            status: "sent" as const,
            time: new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            message: msg.content,
            author: TEMPLATE_LABELS[msg.templateType] || "Mensagem",
          })),
      }
    })

  return groups
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CommunicationPage({ params }: CommunicationPageProps) {
  const { id } = use(params)
  const { patient, loading: patientLoading } = usePatient(id)
  const { messages, loading: messagesLoading } = useMessages(id, { limit: 50 })
  const { appointments } = useAppointments({ patientId: id })
  const [whatsappOpen, setWhatsappOpen] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "manual" | "auto">("all")

  const filteredMessages = useMemo(() => {
    if (filterType === "all") return messages
    if (filterType === "manual") return messages.filter((m) => m.templateType === "free")
    return messages.filter((m) => m.templateType !== "free")
  }, [messages, filterType])

  const timelineGroups = useMemo(() => messagesToTimelineGroups(filteredMessages), [filteredMessages])

  // Next appointment
  const now = new Date()
  const nextApt = appointments
    .filter((a) => new Date(a.dateTime) > now && a.status !== "cancelled" && a.status !== "completed")
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0] ?? null

  const age = patient?.birthDate
    ? Math.floor((now.getTime() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  const loading = patientLoading || messagesLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-[#820AD1] text-3xl">progress_activity</span>
          <p className="text-gray-500 mt-3 text-sm">Carregando comunicações...</p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">person_off</span>
          <p className="text-red-600 mb-4">Paciente não encontrado</p>
          <Link href="/dashboard/pacientes">
            <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-bold py-2.5 px-5 rounded-full transition-all">
              Voltar para lista
            </button>
          </Link>
        </div>
      </div>
    )
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
            patientImage=""
            guardianName={patient.guardianName || "—"}
            guardianRelationship={patient.guardianRelationship || "—"}
            age={age}
            status={patient.status === "active" ? "active" : patient.status === "discharged" ? "discharged" : "inactive"}
            onCall={() => {
              if (patient.guardianPhone) window.open(`tel:${patient.guardianPhone}`)
            }}
            onWhatsApp={() => setWhatsappOpen(true)}
            onEmail={() => {
              if (patient.email) window.open(`mailto:${patient.email}`)
            }}
          />

          {/* Timeline */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 min-h-[600px] relative overflow-hidden flex flex-col border border-white bg-white/90 backdrop-blur-md shadow-lg">
            <CommunicationFilterBar
              onFilterChange={setFilterType}
              onNewMessage={() => setWhatsappOpen(true)}
            />

            {timelineGroups.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">forum</span>
                <p className="text-gray-500 text-sm font-medium">Nenhuma mensagem enviada ainda.</p>
                <button
                  onClick={() => setWhatsappOpen(true)}
                  className="mt-4 bg-[#820AD1] hover:bg-[#820AD1]/90 text-white text-sm font-bold py-2.5 px-5 rounded-full transition-all shadow-lg shadow-[#820AD1]/20 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Enviar primeira mensagem
                </button>
              </div>
            ) : (
              <CommunicationTimeline groups={timelineGroups} />
            )}
          </section>
        </div>
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppMessageModal
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        patient={{
          id,
          name: patient.name,
          guardianName: patient.guardianName,
          guardianPhone: patient.guardianPhone,
          guardianRelationship: patient.guardianRelationship,
        }}
        nextAppointment={nextApt ? { dateTime: nextApt.dateTime, type: nextApt.type, duration: nextApt.duration } : null}
      />
    </div>
  )
}
