"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { PatientListOutput } from "@/lib/core"

// Query Keys
export const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
}

interface PatientFilters {
  page?: number
  limit?: number
  query?: string
  status?: "active" | "inactive" | "discharged"
  therapistId?: string
}

interface PatientListResponse {
  patients: PatientListOutput[]
  total: number
  page: number
  totalPages: number
}

async function fetchPatients(filters: PatientFilters): Promise<PatientListResponse> {
  const params = new URLSearchParams()
  
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.query) params.set("query", filters.query)
  if (filters.status) params.set("status", filters.status)
  if (filters.therapistId) params.set("therapistId", filters.therapistId)

  const response = await fetch(`/api/patients?${params.toString()}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao buscar pacientes")
  }

  return response.json()
}

async function fetchPatient(id: string) {
  const response = await fetch(`/api/patients/${id}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao buscar paciente")
  }

  return response.json()
}

async function updatePatient(id: string, data: Record<string, unknown>) {
  const response = await fetch(`/api/patients/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao atualizar paciente")
  }

  return response.json()
}

async function deletePatient(id: string) {
  const response = await fetch(`/api/patients/${id}`, {
    method: "DELETE",
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao excluir paciente")
  }

  return response.json()
}

// Hooks
export function usePatientsQuery(filters: PatientFilters = {}) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () => fetchPatients(filters),
    placeholderData: (previousData) => previousData,
  })
}

export function usePatientQuery(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => fetchPatient(id),
    enabled: !!id,
  })
}

export function useUpdatePatientMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePatient(id, data),
    onSuccess: (_, variables) => {
      // Invalida a lista e o detalhe específico
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) })
    },
  })
}

export function useDeletePatientMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => {
      // Invalida todas as listas de pacientes
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
    },
  })
}
