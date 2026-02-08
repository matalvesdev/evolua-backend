"use client"

import * as React from "react"
import Link from "next/link"
import { usePatients } from "@/hooks"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PatientCard, PatientFilters, PatientListHeader } from "@/components/patients"
import { filterPatients } from "@/components/patients/patient-utils"

export default function PacientesPage() {
  const { patients, loading } = usePatients({ limit: 100 })
  const [searchTerm, setSearchTerm] = React.useState("")
  const [visibleCount, setVisibleCount] = React.useState(10)

  const filteredPatients = React.useMemo(() => {
    return filterPatients(patients, searchTerm)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getSpecialties = (patient: { medicalHistory?: { diagnosis?: string[] } }) => {
    const specialties: string[] = []
    if (patient.medicalHistory?.diagnosis) {
      specialties.push(...patient.medicalHistory.diagnosis.slice(0, 2))
    }
    return specialties.length > 0 ? specialties : ["Geral"]
  }

  return (
    <>
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Gerenciamento de Pacientes
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Acompanhe a evolução e gerencie sessões dos seus {patients.length} pacientes.
            </p>
          </div>

          {/* Main Glass Panel */}
          <div className="glass-panel rounded-3xl flex-1 flex flex-col relative overflow-hidden">
            {/* Background Illustration */}
            <div className="absolute right-0 top-0 h-full w-1/2 opacity-[0.07] pointer-events-none mix-blend-multiply z-0">
              <div className="h-full w-full bg-linear-to-l from-[#8A05BE]/20 to-transparent" />
            </div>

            <div className="p-6 lg:p-8 relative z-10 flex flex-col">
              {/* Filters: search input + active/total count badges */}
              <PatientFilters
                totalPatients={filteredPatients.length}
                activeCount={activeCount}
                onSearchChange={setSearchTerm}
              />

              {/* Table Header */}
              <PatientListHeader />

              {/* Patient List */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3 text-gray-400">
                    <span className="material-symbols-outlined text-2xl animate-spin">
                      progress_activity
                    </span>
                    <span className="text-sm font-medium">Carregando pacientes...</span>
                  </div>
                </div>
              ) : filteredPatients.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-gray-300">
                      {searchTerm ? "person_search" : "group_off"}
                    </span>
                  </div>
                  <p className="text-gray-600 font-medium text-sm mb-1">
                    {searchTerm
                      ? "Nenhum paciente encontrado"
                      : "Nenhum paciente cadastrado"}
                  </p>
                  <p className="text-gray-400 text-xs mb-4">
                    {searchTerm
                      ? "Tente buscar com outros termos."
                      : "Comece cadastrando seu primeiro paciente."}
                  </p>
                  {!searchTerm && (
                    <Link href="/dashboard/pacientes/novo">
                      <Button className="bg-[#8A05BE] hover:bg-[#6D08AF] text-white rounded-full px-6 py-2.5 text-sm font-bold shadow-lg shadow-[#8A05BE]/20">
                        <span className="material-symbols-outlined text-lg mr-1.5">
                          person_add
                        </span>
                        Cadastrar Primeiro Paciente
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Patient Card Rows */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 pb-4">
                    {visiblePatients.map((patient) => (
                      <PatientCard
                        key={patient.id}
                        id={patient.id}
                        name={patient.name}
                        age={calculateAge(patient.birthDate)}
                        guardian={patient.guardianName}
                        specialties={["Geral"]}
                        status={patient.status as "active" | "inactive"}
                      />
                    ))}
                  </div>

                  {/* Load More Button */}
                  {visibleCount < filteredPatients.length && (
                    <div className="flex justify-center pt-4 border-t border-gray-100/50">
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 10)}
                        className="flex items-center gap-2 text-sm font-bold text-[#8A05BE] hover:bg-[#8A05BE]/5 px-5 py-2.5 rounded-xl transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                        Carregar mais pacientes
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
