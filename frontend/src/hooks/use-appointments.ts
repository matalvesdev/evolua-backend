import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as appointmentsApi from "@/lib/api/appointments"
import type { Appointment, CreateAppointmentInput } from "@/lib/api/appointments"

export type { Appointment }

export function useAppointments(params?: {
  patientId?: string
  therapistId?: string
  status?: string
  type?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["appointments", params],
    queryFn: () => appointmentsApi.listAppointments(params),
  })

  return {
    appointments: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error,
    refetch,
  }
}

export function useAppointment(id: string) {
  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => appointmentsApi.getAppointment(id),
    enabled: !!id,
  })

  return { appointment, loading: isLoading, error }
}

export function useTodayAppointments() {
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

  return useAppointments({ startDate, endDate })
}

export function useWeekAppointments() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return useAppointments({
    startDate: startOfWeek.toISOString(),
    endDate: endOfWeek.toISOString(),
  })
}

export function useAppointmentMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: CreateAppointmentInput) => appointmentsApi.createAppointment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] })
    queryClient.invalidateQueries({ queryKey: ["appointment"] })
  }

  const confirmMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.confirmAppointment(id),
    onSuccess: invalidateAll,
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.startAppointment(id),
    onSuccess: invalidateAll,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason, cancelledBy, notes }: { id: string; reason: string; cancelledBy: string; notes?: string }) =>
      appointmentsApi.cancelAppointment(id, reason, cancelledBy, notes),
    onSuccess: invalidateAll,
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, sessionNotes }: { id: string; sessionNotes?: string }) =>
      appointmentsApi.completeAppointment(id, sessionNotes),
    onSuccess: invalidateAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.deleteAppointment(id),
    onSuccess: invalidateAll,
  })

  return {
    createAppointment: createMutation.mutateAsync,
    confirmAppointment: confirmMutation.mutateAsync,
    startAppointment: startMutation.mutateAsync,
    cancelAppointment: cancelMutation.mutateAsync,
    completeAppointment: completeMutation.mutateAsync,
    deleteAppointment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}
