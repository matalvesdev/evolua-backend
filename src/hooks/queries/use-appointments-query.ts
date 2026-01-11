"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AppointmentListOutput } from "@/lib/core"

// Query Keys
export const appointmentKeys = {
  all: ["appointments"] as const,
  lists: () => [...appointmentKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...appointmentKeys.lists(), filters] as const,
  today: () => [...appointmentKeys.all, "today"] as const,
  details: () => [...appointmentKeys.all, "detail"] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
}

interface AppointmentFilters {
  page?: number
  limit?: number
  patientId?: string
  therapistId?: string
  dateFrom?: string
  dateTo?: string
  status?: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show"
}

interface AppointmentListResponse {
  appointments: AppointmentListOutput[]
  total: number
  page: number
  totalPages: number
}

async function fetchAppointments(filters: AppointmentFilters): Promise<AppointmentListResponse> {
  const params = new URLSearchParams()
  
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.patientId) params.set("patientId", filters.patientId)
  if (filters.therapistId) params.set("therapistId", filters.therapistId)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  if (filters.status) params.set("status", filters.status)

  const response = await fetch(`/api/appointments?${params.toString()}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao buscar agendamentos")
  }

  return response.json()
}

async function fetchTodayAppointments(): Promise<AppointmentListResponse> {
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  return fetchAppointments({
    dateFrom: startOfDay,
    dateTo: endOfDay,
    limit: 50,
  })
}

async function fetchAppointment(id: string) {
  const response = await fetch(`/api/appointments/${id}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao buscar agendamento")
  }

  return response.json()
}

async function createAppointment(data: Record<string, unknown>) {
  const response = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao criar agendamento")
  }

  return response.json()
}

async function updateAppointment(id: string, action: string, data?: Record<string, unknown>) {
  const response = await fetch(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao atualizar agendamento")
  }

  return response.json()
}

// Hooks
export function useAppointmentsQuery(filters: AppointmentFilters = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () => fetchAppointments(filters),
    placeholderData: (previousData) => previousData,
  })
}

export function useTodayAppointmentsQuery() {
  return useQuery({
    queryKey: appointmentKeys.today(),
    queryFn: fetchTodayAppointments,
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
  })
}

export function useAppointmentQuery(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => fetchAppointment(id),
    enabled: !!id,
  })
}

export function useCreateAppointmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: appointmentKeys.today() })
    },
  })
}

export function useConfirmAppointmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => updateAppointment(id, "confirm"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}

export function useStartAppointmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => updateAppointment(id, "start"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}

export function useCompleteAppointmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, sessionNotes }: { id: string; sessionNotes?: Record<string, unknown> }) =>
      updateAppointment(id, "complete", { sessionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}

export function useCancelAppointmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      reason,
      cancelledBy,
      note,
    }: {
      id: string
      reason: string
      cancelledBy: "patient" | "therapist"
      note?: string
    }) => updateAppointment(id, "cancel", { reason, cancelledBy, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}

export function useRescheduleAppointmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      newDateTime,
      reason,
    }: {
      id: string
      newDateTime: string
      reason?: string
    }) => updateAppointment(id, "reschedule", { newDateTime, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}
