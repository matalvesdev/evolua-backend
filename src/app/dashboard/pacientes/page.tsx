"use client"

import * as React from "react"
import Link from "next/link"
import { usePatients } from "@/hooks"
import { Button } from "@/components/ui/button"
import { PatientCard, PatientFilters, PatientListHeader } from "@/components/patients"

export default function PacientesPage() {
  const { patients, loading } = usePatients({ limit: 100 })
  const [searchTerm, setSearchTerm] = React.useState("")
  const [visibleCount, setVisibleCount] = React.useState(10)

  const filteredPatients = React.useMemo(() => {
    if (!searchTerm) return patients

    const search = searchTerm.toLowerCase()
    return patients.filter((patient) => {
      return (
        patient.name.toLowerCase().includes(search) ||
        patient.email?.toLowerCase().includes(search) ||
        patient.guardianName?.toLowerCase().includes(search)
      )
    })
  }, [patients, searchTerm])

  const visiblePatients = filteredPatients.slice(0, visibleCount)
  const activeCount = patients.filter((p) => p.status === "active").length

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return undefined
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getSpecialties = (patient: { medicalHistory?: { diagnosis?: string[] } }) => {
    const specialties: string[] = []
    if (patient.medicalHistory?.diagnosis) {
      specialties.push(...patient.medicalHistory.diagnosis.slice(0, 2))
    }
    return specialties.length > 0 ? specialties : ["Geral"]
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
            Gerenciamento de Pacientes
          </h1>
          <p className="text-gray-600 font-medium">
            Acompanhe a evolução e gerencie sessões dos seus {patients.length} pacientes.
          </p>
        </div>
      </div>

      {/* Main Panel */}
      <div className="glass-panel rounded-3xl flex-1 flex flex-col relative overflow-hidden">
        {/* Background Illustration */}
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 pointer-events-none mix-blend-multiply z-0">
          <div className="h-full w-full bg-gradient-to-l from-purple-100 to-transparent" />
        </div>

        <div className="p-6 lg:p-8 relative z-10 flex flex-col">
          {/* Filters */}
          <PatientFilters
            totalPatients={filteredPatients.length}
            activeCount={activeCount}
            onSearchChange={setSearchTerm}
          />

          {/* Table Header */}
          <PatientListHeader />

          {/* Patient List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600 dark:text-gray-400">Carregando pacientes...</div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                person_search
              </span>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {searchTerm ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
              </p>
              {!searchTerm && (
                <Link href="/dashboard/pacientes/novo">
                  <Button className="bg-purple-600 hover:bg-purple-700 mt-4">
                    + Cadastrar Primeiro Paciente
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
                {visiblePatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    id={patient.id}
                    name={patient.name}
                    age={calculateAge(patient.birthDate)}
                    guardian={patient.guardianName}
                    specialties={getSpecialties(patient)}
                    status={patient.status}
                  />
                ))}
              </div>

              {/* Load More */}
              {visibleCount < filteredPatients.length && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="flex items-center gap-2 text-sm font-bold text-primary hover:bg-purple-50 px-4 py-2 rounded-xl transition-colors"
                  >
                    Carregar mais pacientes
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    active: {
      label: 'Ativo',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    inactive: {
      label: 'Inativo',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    },
    discharged: {
      label: 'Alta',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    },
  };

  const config = statusConfig[status] ?? {
    label: status,
    color: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}
