"use client"

import * as React from "react"
import {
  listPatientsAction,
  getPatientAction,
  createPatientAction,
  updatePatientAction,
  deletePatientAction,
  dischargePatientAction,
  reactivatePatientAction,
} from "@/actions"
import type { CreatePatientInput, UpdatePatientInput } from "@/lib/core"
import type { Patient } from "@/lib/core/domain/entities/patient"

// ============================================================================
// TYPES
// ============================================================================

type PatientFilters = {
  search?: string
  status?: string
  therapistId?: string
  page?: number
  limit?: number
}

// ============================================================================
// USE PATIENTS HOOK
// Lista de pacientes com paginação e filtros
// ============================================================================

export function usePatients(initialFilters?: PatientFilters) {
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(initialFilters?.page ?? 1)
  const [limit, setLimit] = React.useState(initialFilters?.limit ?? 10)
  const [totalPages, setTotalPages] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<PatientFilters>(initialFilters ?? {})

  const fetchPatients = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await listPatientsAction({
      ...filters,
      page,
      limit,
    })

    if (result.success) {
      setPatients(result.data.data)
      setTotal(result.data.total)
      setTotalPages(result.data.totalPages)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [filters, page, limit])

  React.useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const updateFilters = React.useCallback((newFilters: PatientFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset para primeira página ao mudar filtros
  }, [])

  return {
    patients,
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
    refetch: fetchPatients,
  }
}

// ============================================================================
// USE PATIENT HOOK
// Detalhes de um paciente específico
// ============================================================================

import type { Patient } from "@/lib/core/domain/entities/patient"

export function usePatient(id: string | null) {
  const [patient, setPatient] = React.useState<Patient | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchPatient = React.useCallback(async () => {
    if (!id) {
      setPatient(null)
      return
    }

    setLoading(true)
    setError(null)

    const result = await getPatientAction(id)

    if (result.success && result.data.patient) {
      setPatient(result.data.patient)
    } else {
      setError(result.success ? "Paciente não encontrado" : result.error)
    }

    setLoading(false)
  }, [id])

  React.useEffect(() => {
    fetchPatient()
  }, [fetchPatient])

  return {
    patient,
    loading,
    error,
    refetch: fetchPatient,
  }
}

// ============================================================================
// USE PATIENT MUTATIONS HOOK
// Criar, atualizar, excluir pacientes
// ============================================================================

export function usePatientMutations() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const create = React.useCallback(async (input: CreatePatientInput) => {
    setLoading(true)
    setError(null)

    const result = await createPatientAction(input)

    setLoading(false)

    if (result.success) {
      return { success: true as const, data: result.data }
    } else {
      setError(result.error)
      return { success: false as const, error: result.error }
    }
  }, [])

  const update = React.useCallback(
    async (id: string, input: UpdatePatientInput) => {
      setLoading(true)
      setError(null)

      const result = await updatePatientAction(id, input)

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

  const remove = React.useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    const result = await deletePatientAction(id)

    setLoading(false)

    if (result.success) {
      return { success: true as const }
    } else {
      setError(result.error)
      return { success: false as const, error: result.error }
    }
  }, [])

  const discharge = React.useCallback(
    async (id: string, dischargeDate: Date) => {
      setLoading(true)
      setError(null)

      const result = await dischargePatientAction(id, dischargeDate)

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

  const reactivate = React.useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    const result = await reactivatePatientAction(id)

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
    update,
    remove,
    discharge,
    reactivate,
  }
}
