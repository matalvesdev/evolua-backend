"use client"

import * as React from "react"
import {
  listAppointmentsAction,
  getAppointmentAction,
  createAppointmentAction,
  cancelAppointmentAction,
  completeAppointmentAction,
  confirmAppointmentAction,
  startAppointmentAction,
  rescheduleAppointmentAction,
  getTodayAppointmentsAction,
  getWeekAppointmentsAction,
} from "@/actions"
import type {
  CreateAppointmentInput,
  CancellationReason,
} from "@/lib/core"
import type { Appointment } from "@/lib/core/domain/entities/appointment"

// ============================================================================
// TYPES
// ============================================================================

type AppointmentFilters = {
  patientId?: string
  therapistId?: string
  clinicId?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

type SessionNotes = {
  objectives?: string
  activities?: string
  observations?: string
  patientResponse?: string
  homeExercises?: string
  nextSessionPlanning?: string
}

// ============================================================================
// USE APPOINTMENTS HOOK
// Lista de agendamentos com paginação e filtros
// ============================================================================

export function useAppointments(initialFilters?: AppointmentFilters) {
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(initialFilters?.page ?? 1)
  const [limit, setLimit] = React.useState(initialFilters?.limit ?? 10)
  const [totalPages, setTotalPages] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<AppointmentFilters>(
    initialFilters ?? {}
  )

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await listAppointmentsAction({
      ...filters,
      page,
      limit,
    })

    if (result.success) {
      setAppointments(result.data.data)
      setTotal(result.data.total)
      setTotalPages(result.data.totalPages)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [filters, page, limit])

  React.useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const updateFilters = React.useCallback((newFilters: AppointmentFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1)
  }, [])

  return {
    appointments,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    filters,
    setPage,
    setLimit,
    updateFilters,
    refetch: fetchAppointments,
  }
}

// ============================================================================
// USE APPOINTMENT HOOK
// Detalhes de um agendamento específico
// ============================================================================

export function useAppointment(id: string | null) {
  const [appointment, setAppointment] = React.useState<AppointmentOutput | null>(
    null
  )
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchAppointment = React.useCallback(async () => {
    if (!id) {
      setAppointment(null)
      return
    }

    setLoading(true)
    setError(null)

    const result = await getAppointmentAction(id)

    if (result.success) {
      setAppointment(result.data)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [id])

  React.useEffect(() => {
    fetchAppointment()
  }, [fetchAppointment])

  return {
    appointment,
    loading,
    error,
    refetch: fetchAppointment,
  }
}

// ============================================================================
// USE TODAY APPOINTMENTS HOOK
// Agendamentos de hoje
// ============================================================================

export function useTodayAppointments(therapistId?: string) {
  const [appointments, setAppointments] = React.useState<AppointmentOutput[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getTodayAppointmentsAction(therapistId)

    if (result.success) {
      setAppointments(result.data)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [therapistId])

  React.useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
  }
}

// ============================================================================
// USE WEEK APPOINTMENTS HOOK
// Agendamentos da semana
// ============================================================================

export function useWeekAppointments(startDate: Date, therapistId?: string) {
  const [appointments, setAppointments] = React.useState<AppointmentOutput[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getWeekAppointmentsAction(startDate, therapistId)

    if (result.success) {
      setAppointments(result.data)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [startDate, therapistId])

  React.useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
  }
}

// ============================================================================
// USE APPOINTMENT MUTATIONS HOOK
// Criar, atualizar, cancelar agendamentos
// ============================================================================

export function useAppointmentMutations() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const create = React.useCallback(async (input: CreateAppointmentInput) => {
    setLoading(true)
    setError(null)

    const result = await createAppointmentAction(input)

    setLoading(false)

    if (result.success) {
      return { success: true as const, data: result.data }
    } else {
      setError(result.error)
      return { success: false as const, error: result.error }
    }
  }, [])

  const cancel = React.useCallback(
    async (
      id: string,
      reason: "patient_request" | "therapist_request" | "illness" | "emergency" | "schedule_conflict" | "no_show" | "other",
      cancelledBy: "patient" | "therapist",
      note?: string
    ) => {
      setLoading(true)
      setError(null)

      const result = await cancelAppointmentAction(id, reason, cancelledBy, note)

      setLoading(false)

      if (result.success) {
        return { success: true as const, data: result.data }
      } else {
        setError(result.error)
        return { success: false as const, error: result.error }
      }
    },
    []
  )

  const complete = React.useCallback(
    async (id: string, sessionNotes?: SessionNotes) => {
      setLoading(true)
      setError(null)

      const result = await completeAppointmentAction(id, sessionNotes)

      setLoading(false)

      if (result.success) {
        return { success: true as const, data: result.data }
      } else {
        setError(result.error)
        return { success: false as const, error: result.error }
      }
    },
    []
  )

  const reschedule = React.useCallback(
    async (id: string, newDateTime: Date) => {
      setLoading(true)
      setError(null)

      const result = await rescheduleAppointmentAction(id, newDateTime)

      setLoading(false)

      if (result.success) {
        return { success: true as const, data: result.data }
      } else {
        setError(result.error)
        return { success: false as const, error: result.error }
      }
    },
    []
  )

  const confirm = React.useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    const result = await confirmAppointmentAction(id)

    setLoading(false)

    if (result.success) {
      return { success: true as const, data: result.data }
    } else {
      setError(result.error)
      return { success: false as const, error: result.error }
    }
  }, [])

  const start = React.useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    const result = await startAppointmentAction(id)

    setLoading(false)

    if (result.success) {
      return { success: true as const, data: result.data }
    } else {
      setError(result.error)
      return { success: false as const, error: result.error }
    }
  }, [])

  return {
    loading,
    error,
    create,
    cancel,
    complete,
    reschedule,
    confirm,
    start,
  }
}
