"use client"

import { use } from "react"
import Link from "next/link"
import {
  PatientGoalHeader,
  TherapeuticObjective,
  GoalCard,
  WeeklyActivitiesPlan,
} from "@/components/patient-goals"

interface GoalsPageProps {
  params: Promise<{ id: string }>
}

export default function GoalsPage({ params }: GoalsPageProps) {
  const { id } = use(params)

  // Mock data - substituir por dados reais do Supabase
  const patient = {
    name: "Ana Clara Souza",
    image: "",
    status: "active" as const,
    age: 5,
    birthDate: "12/05/2019",
    specialty: "Terapia de Linguagem",
    schooling: "Pré-escola",
    startDate: "15 Ago '23",
    overallProgress: 65,
  }

  const therapeuticObjective = {
    title: "Desenvolver a inteligibilidade da fala e a competência comunicativa",
    description:
      "O foco desta etapa do tratamento é aprimorar a articulação dos fonemas fricativos e vibrantes (/s/, /z/, /r/), permitindo que Ana Clara participe de conversas na escola e em casa com maior confiança e clareza, reduzindo episódios de frustração comunicativa.",
    definedDate: "15/08/2023",
  }

  const shortTermGoals = [
    {
      id: "1",
      title: "Aquisição do Fonema /r/",
      description:
        "Produção correta do /r/ em encontros consonantais (ex: prato, braço) em frases simples.",
      progress: 70,
      status: "in-progress" as const,
      iconName: "graphic_eq",
      colorScheme: "purple" as const,
    },
    {
      id: "2",
      title: "Expansão de Vocabulário",
      description:
        "Incorporar 10 novos verbos de ação no discurso espontâneo durante as sessões lúdicas.",
      progress: 45,
      status: "attention" as const,
      iconName: "record_voice_over",
      colorScheme: "blue" as const,
    },
    {
      id: "3",
      title: "Consciência Fonológica",
      description:
        "Identificar rimas e aliterações em canções infantis sem auxílio visual.",
      progress: 20,
      status: "started" as const,
      iconName: "psychology",
      colorScheme: "pink" as const,
    },
  ]

  const weeklyActivities = [
    {
      id: "1",
      title: "Jogo da Memória dos Sons",
      description:
        "Utilizar cartas com imagens que contenham o fonema /r/ em posição inicial. Focar na repetição da palavra ao virar a carta.",
      location: "home" as const,
      duration: "15 min",
      completed: false,
    },
    {
      id: "2",
      title: "Repetição de Frases com Apoio Visual",
      description:
        'Ler o livro "O Rato Roeu" e pedir para a criança completar as frases finais de cada página.',
      location: "office" as const,
      completed: false,
    },
    {
      id: "3",
      title: "Exercício de Sopro e Respiração",
      description:
        "Soprar bolinhas de algodão com canudo em labirinto desenhado no papel.",
      location: "completed" as const,
      completed: true,
    },
  ]

  const handleAddGoal = () => {
    console.log("Adicionar nova meta")
  }

  const handleAddActivity = () => {
    console.log("Adicionar nova atividade")
  }

  const handleActivityToggle = (activityId: string, checked: boolean) => {
    console.log(`Atividade ${activityId} marcada como ${checked ? "concluída" : "pendente"}`)
  }

  return (
    <div className="relative min-h-screen">
      {/* Gradient Orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-8 pb-32">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/dashboard/pacientes" className="hover:text-[#820AD1] transition-colors">
            Pacientes
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link href={`/dashboard/pacientes/${id}`} className="hover:text-[#820AD1] transition-colors">
            {patient.name}
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#820AD1] font-medium">Plano e Metas</span>
        </div>

        <div className="flex flex-col gap-6">
          {/* Patient Header */}
          <PatientGoalHeader
            patientName={patient.name}
            patientImage={patient.image}
            status={patient.status}
            age={patient.age}
            birthDate={patient.birthDate}
            specialty={patient.specialty}
            schooling={patient.schooling}
            startDate={patient.startDate}
            overallProgress={patient.overallProgress}
          />

          {/* Therapeutic Objective */}
          <TherapeuticObjective
            title={therapeuticObjective.title}
            description={therapeuticObjective.description}
            definedDate={therapeuticObjective.definedDate}
          />

          {/* Short-term Goals */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className="bg-[#820AD1]/10 p-1.5 rounded-lg text-[#820AD1]">
                  <span className="material-symbols-outlined text-[20px]">target</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Metas de Curto Prazo</h3>
              </div>
              <span className="text-sm font-medium px-3 py-1 bg-white/50 rounded-full text-gray-600 border border-white/50 shadow-sm">
                {shortTermGoals.length} metas ativas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shortTermGoals.map((goal) => (
                <GoalCard key={goal.id} {...goal} />
              ))}
            </div>
          </section>

          {/* Weekly Activities Plan */}
          <WeeklyActivitiesPlan
            activities={weeklyActivities}
            onAddActivity={handleAddActivity}
            onActivityToggle={handleActivityToggle}
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleAddGoal}
        className="fixed bottom-8 right-8 size-16 bg-[#820AD1] hover:bg-[#6D08AF] text-white rounded-2xl shadow-xl hover:scale-105 hover:shadow-[#820AD1]/40 transition-all flex items-center justify-center group z-50"
      >
        <span className="material-symbols-outlined text-[32px] group-hover:rotate-90 transition-transform duration-300">
          add
        </span>
        <div className="absolute right-full mr-4 bg-white/90 backdrop-blur-md text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg opacity-0 translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none border border-white/50">
          Adicionar Nova Meta
        </div>
      </button>
    </div>
  )
}
