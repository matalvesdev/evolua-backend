"use client"

import * as React from "react"
import { usePatients } from "@/hooks"
import { Button } from "@/components/ui/button"
import { 
  PatientCard, 
  PatientFilters, 
  PatientListHeader 
} from "@/components/patients"

export default function PacientesPage() {
  const [search, setSearch] = React.useState("")
  const [visibleCount, setVisibleCount] = React.useState(10)
  const { patients, loading } = usePatients()

  // Calculate age from birthdate
  const calculateAge = (birthdate: string) => {
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Extract specialties from diagnosis/medical_history
  const getSpecialties = (medicalHistory: any): string[] => {
    if (!medicalHistory) return []
    const specialties = []
    if (medicalHistory.diagnosis?.toLowerCase().includes('tea')) specialties.push('TEA')
    if (medicalHistory.diagnosis?.toLowerCase().includes('autismo')) specialties.push('TEA')
    if (medicalHistory.diagnosis?.toLowerCase().includes('fala')) specialties.push('Fala')
    if (medicalHistory.diagnosis?.toLowerCase().includes('linguagem')) specialties.push('Linguagem')
    return specialties.length > 0 ? specialties : ['Geral']
  }

  // Filter patients based on search
  const filteredPatients = React.useMemo(() => {
    if (!search) return patients || []
    const searchLower = search.toLowerCase()
    return (patients || []).filter((patient: any) =>
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.cpf?.toLowerCase().includes(searchLower) ||
      patient.email?.toLowerCase().includes(searchLower)
    )
  }, [patients, search])

  // Visible patients with load more
  const visiblePatients = filteredPatients.slice(0, visibleCount)
  const hasMore = visibleCount < filteredPatients.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#820AD1] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando pacientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-8">
      {/* Gradient Orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pacientes</h1>
            <p className="text-gray-600">Gerencie seus pacientes cadastrados</p>
          </div>
        </div>

        {/* Glass Panel */}
        <div className="glass-panel rounded-3xl p-8">
          {/* Filters */}
          <PatientFilters
            search={search}
            onSearchChange={setSearch}
            totalPatients={filteredPatients.length}
          />

          {/* Table Header */}
          <PatientListHeader />

          {/* Patient List */}
          <div className="space-y-3">
            {visiblePatients.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                  person_off
                </span>
                <p className="text-gray-500 text-lg">
                  {search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
                </p>
              </div>
            ) : (
              visiblePatients.map((patient: any) => (
                <PatientCard
                  key={patient.id}
                  id={patient.id}
                  name={patient.name}
                  age={calculateAge(patient.birthdate)}
                  specialties={getSpecialties(patient.medical_history)}
                  sessions={{ completed: 0, total: 0 }}
                  nextSession={null}
                  status={patient.status || 'active'}
                />
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="glass-card-item px-8 py-3 rounded-xl text-[#820AD1] font-medium hover:shadow-lg transition-all"
              >
                Carregar mais pacientes
                <span className="material-symbols-outlined ml-2 text-xl">
                  expand_more
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
