"use client"

import * as React from "react"
import {
  listReportsAction,
  getReportAction,
  createReportAction,
  updateReportAction,
  submitReportForReviewAction,
  getPatientReportsAction,
  getPendingReportsAction,
} from "@/actions"
import type {
  CreateReportInput,
  UpdateReportInput,
} from "@/lib/core"
import type { Report } from "@/lib/core/domain/entities/report"

// ============================================================================
// TYPES
// ============================================================================

type ReportFilters = {
  patientId?: string
  therapistId?: string
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// ============================================================================
// USE REPORTS HOOK
// Lista de relatórios com paginação e filtros
// ============================================================================

export function useReports(initialFilters?: ReportFilters) {
  const [reports, setReports] = React.useState<Report[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(initialFilters?.page ?? 1)
  const [limit, setLimit] = React.useState(initialFilters?.limit ?? 10)
  const [totalPages, setTotalPages] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<ReportFilters>(initialFilters ?? {})

  const fetchReports = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await listReportsAction({
      ...filters,
      page,
      limit,
    })

    if (result.success) {
      setReports(result.data.data)
      setTotal(result.data.total)
      setTotalPages(result.data.totalPages)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [filters, page, limit])

  React.useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const updateFilters = React.useCallback((newFilters: ReportFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1)
  }, [])

  return {
    reports,
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
    refetch: fetchReports,
  }
}

// ============================================================================
// USE REPORT HOOK
// Detalhes de um relatório específico
// ============================================================================

export function useReport(id: string | null) {
  const [report, setReport] = React.useState<Report | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchReport = React.useCallback(async () => {
    if (!id) {
      setReport(null)
      return
    }

    setLoading(true)
    setError(null)

    const result = await getReportAction(id)

    if (result.success && result.data?.report) {
      setReport(result.data.report)
    } else {
      setError(result.success ? "Relatório não encontrado" : result.error)
    }

    setLoading(false)
  }, [id])

  React.useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return {
    report,
    loading,
    error,
    refetch: fetchReport,
  }
}

// ============================================================================
// USE PATIENT REPORTS HOOK
// Relatórios de um paciente específico
// ============================================================================

export function usePatientReports(patientId: string | null) {
  const [reports, setReports] = React.useState<Report[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchReports = React.useCallback(async () => {
    if (!patientId) {
      setReports([])
      return
    }

    setLoading(true)
    setError(null)

    const result = await getPatientReportsAction(patientId)

    if (result.success) {
      setReports(result.data)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [patientId])

  React.useEffect(() => {
    fetchReports()
  }, [fetchReports])

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
  }
}

// ============================================================================
// USE PENDING REPORTS HOOK
// Relatórios pendentes de revisão
// ============================================================================

export function usePendingReports(therapistId?: string) {
  const [reports, setReports] = React.useState<ReportListOutput[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchReports = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getPendingReportsAction(therapistId)

    if (result.success) {
      setReports(result.data)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [therapistId])

  React.useEffect(() => {
    fetchReports()
  }, [fetchReports])

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
  }
}

// ============================================================================
// USE REPORT MUTATIONS HOOK
// Criar, atualizar, aprovar relatórios
// ============================================================================

export function useReportMutations() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const create = React.useCallback(async (input: CreateReportInput) => {
    setLoading(true)
    setError(null)

    const result = await createReportAction(input)

    setLoading(false)

    if (result.success) {
      return { success: true as const, data: result.data }
    } else {
      setError(result.error)
      return { success: false as const, error: result.error }
    }
  }, [])

  const update = React.useCallback(
    async (id: string, input: UpdateReportInput) => {
      setLoading(true)
      setError(null)

      const result = await updateReportAction(id, input)

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

  const submitForReview = React.useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    const result = await submitReportForReviewAction(id)

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
    submitForReview,
  }
}
