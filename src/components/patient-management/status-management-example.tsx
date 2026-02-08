"use client"

import { useState } from "react"
import { StatusTransitionDialog } from "./status-transition-dialog"
import { PatientStatusDashboard } from "./patient-status-dashboard"
import { StatusFilterBar } from "./status-filter-bar"
import type { PatientStatusType } from "@/lib/core/domain/types"
import type { StatusStatistics, StatusTransitionItem } from "./patient-status-dashboard"

/**
 * Status Management Example Component
 * 
 * This component demonstrates how to use the three status management UI components:
 * 1. StatusTransitionDialog - For changing patient status
 * 2. PatientStatusDashboard - For viewing status statistics
 * 3. StatusFilterBar - For filtering patients by status
 * 
 * Requirements: 3.1, 3.2, 7.2
 */

// Mock data for demonstration
const mockStatistics: StatusStatistics = {
  totalPatients: 45,
  statusCounts: {
    active: 28,
    inactive: 2,
    discharged: 6,
    "on-hold": 9,
  } as Record<string, number>,
  recentTransitions: [
    {
      id: "1",
      patientName: "Maria Silva",
      patientId: "patient-1",
      fromStatus: null,
      toStatus: "active",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      changedByName: "Dr. João Santos",
    },
    {
      id: "2",
      patientName: "Pedro Oliveira",
      patientId: "patient-2",
      fromStatus: "active",
      toStatus: "on-hold",
      reason: "Paciente solicitou pausa no tratamento por motivos pessoais",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      changedByName: "Dr. Ana Costa",
    },
    {
      id: "3",
      patientName: "Lucas Ferreira",
      patientId: "patient-3",
      fromStatus: "active",
      toStatus: "discharged",
      reason: "Tratamento concluído com sucesso",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      changedByName: "Dr. João Santos",
    },
    {
      id: "4",
      patientName: "Ana Paula",
      patientId: "patient-4",
      fromStatus: "on-hold",
      toStatus: "active",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      changedByName: "Dr. Ana Costa",
    },
    {
      id: "5",
      patientName: "Carlos Eduardo",
      patientId: "patient-5",
      fromStatus: null,
      toStatus: "active",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      changedByName: "Sistema",
    },
  ],
  averageTimeInStatus: {
    active: 45,
    "on-hold": 14,
    discharged: 90,
    inactive: 180,
  } as Record<string, number>,
}

export function StatusManagementExample() {
  // State for status transition dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string
    name: string
    currentStatus: PatientStatusType
  } | null>(null)

  // State for status filters
  const [selectedStatuses, setSelectedStatuses] = useState<PatientStatusType[]>([])
  const [searchValue, setSearchValue] = useState("")

  // State for statistics (in real app, this would come from API)
  const [statistics, setStatistics] = useState<StatusStatistics>(mockStatistics)

  // Handler for opening status transition dialog
  const handleOpenStatusDialog = (patientId: string, patientName: string, currentStatus: PatientStatusType) => {
    setSelectedPatient({ id: patientId, name: patientName, currentStatus })
    setIsDialogOpen(true)
  }

  // Handler for status change
  const handleStatusChange = async (newStatus: PatientStatusType, reason?: string) => {
    if (!selectedPatient) return

    console.log("Changing status:", {
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      fromStatus: selectedPatient.currentStatus,
      toStatus: newStatus,
      reason,
    })

    // In a real application, you would call the StatusTracker service here:
    // await statusTracker.changePatientStatus({
    //   patientId: new PatientId(selectedPatient.id),
    //   newStatus,
    //   reason,
    //   userId: new UserId(currentUserId)
    // })

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Update statistics (in real app, refetch from API)
    setStatistics((prev) => {
      const newStats = { ...prev }
      
      // Update counts
      newStats.statusCounts[selectedPatient.currentStatus] -= 1
      newStats.statusCounts[newStatus] += 1

      // Add to recent transitions
      const newTransition: StatusTransitionItem = {
        id: `transition-${Date.now()}`,
        patientName: selectedPatient.name,
        patientId: selectedPatient.id,
        fromStatus: selectedPatient.currentStatus,
        toStatus: newStatus,
        reason,
        timestamp: new Date(),
        changedByName: "Você",
      }
      newStats.recentTransitions = [newTransition, ...newStats.recentTransitions.slice(0, 4)]

      return newStats
    })

    // Update selected patient status
    setSelectedPatient((prev) => prev ? { ...prev, currentStatus: newStatus } : null)
  }

  // Handler for status filter toggle
  const handleStatusToggle = (status: PatientStatusType) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  // Handler for clearing filters
  const handleClearFilters = () => {
    setSelectedStatuses([])
    setSearchValue("")
  }

  // Handler for status card click in dashboard
  const handleStatusClick = (status: PatientStatusType) => {
    // Toggle the status filter
    handleStatusToggle(status)
  }

  // Handler for transition click in dashboard
  const handleTransitionClick = (transition: StatusTransitionItem) => {
    console.log("Transition clicked:", transition)
    // In a real app, you might navigate to the patient profile or show details
  }

  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Status</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e monitore o status dos seus pacientes
          </p>
        </div>
      </div>

      {/* Status Dashboard */}
      <PatientStatusDashboard
        statistics={statistics}
        onStatusClick={handleStatusClick}
        onTransitionClick={handleTransitionClick}
      />

      {/* Divider */}
      <div className="border-t pt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Lista de Pacientes</h2>
        
        {/* Status Filter Bar */}
        <StatusFilterBar
          statusCounts={statistics.statusCounts}
          selectedStatuses={selectedStatuses}
          onStatusToggle={handleStatusToggle}
          onClearFilters={handleClearFilters}
          showSearch={true}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />

        {/* Patient List (Mock) */}
        <div className="mt-6 space-y-3">
          {/* This would be your actual patient list component */}
          <div className="p-4 bg-white rounded-lg border">
            <p className="text-sm text-muted-foreground text-center">
              {selectedStatuses.length > 0 || searchValue
                ? `Mostrando pacientes filtrados por: ${selectedStatuses.length > 0 ? `status (${selectedStatuses.length})` : ''} ${searchValue ? `busca: "${searchValue}"` : ''}`
                : "Sua lista de pacientes apareceria aqui"}
            </p>
          </div>

          {/* Example patient card with status change button */}
          <div className="p-4 bg-white rounded-lg border flex items-center justify-between">
            <div>
              <p className="font-semibold">Maria Silva</p>
              <p className="text-sm text-muted-foreground">Status: Ativo</p>
            </div>
            <button
              onClick={() => handleOpenStatusDialog("patient-1", "Maria Silva", "active")}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">swap_horiz</span>
              Alterar Status
            </button>
          </div>
        </div>
      </div>

      {/* Status Transition Dialog */}
      {selectedPatient && (
        <StatusTransitionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          currentStatus={selectedPatient.currentStatus}
          patientName={selectedPatient.name}
          patientId={selectedPatient.id}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
