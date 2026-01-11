"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ReportListOutput } from "@/lib/core"

// Query Keys
export const reportKeys = {
  all: ["reports"] as const,
  lists: () => [...reportKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...reportKeys.lists(), filters] as const,
  pending: () => [...reportKeys.all, "pending"] as const,
  details: () => [...reportKeys.all, "detail"] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
}

interface ReportFilters {
  page?: number
  limit?: number
  patientId?: string
  therapistId?: string
  type?: "evaluation" | "evolution" | "progress" | "discharge" | "monthly" | "school" | "medical" | "custom"
  status?: "draft" | "pending_review" | "approved" | "sent"
  createdFrom?: string
  createdTo?: string
}

interface ReportListResponse {
  reports: ReportListOutput[]
  total: number
  page: number
  totalPages: number
}

async function fetchReports(filters: ReportFilters): Promise<ReportListResponse> {
  const params = new URLSearchParams()
  
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.patientId) params.set("patientId", filters.patientId)
  if (filters.therapistId) params.set("therapistId", filters.therapistId)
  if (filters.type) params.set("type", filters.type)
  if (filters.status) params.set("status", filters.status)
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom)
  if (filters.createdTo) params.set("createdTo", filters.createdTo)

  const response = await fetch(`/api/reports?${params.toString()}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao buscar relatórios")
  }

  return response.json()
}

async function fetchPendingReports(): Promise<ReportListResponse> {
  return fetchReports({
    status: "pending_review",
    limit: 50,
  })
}

async function fetchReport(id: string) {
  const response = await fetch(`/api/reports/${id}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao buscar relatório")
  }

  return response.json()
}

async function createReport(data: Record<string, unknown>) {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao criar relatório")
  }

  return response.json()
}

async function updateReport(id: string, action: string, data?: Record<string, unknown>) {
  const response = await fetch(`/api/reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao atualizar relatório")
  }

  return response.json()
}

async function deleteReport(id: string) {
  const response = await fetch(`/api/reports/${id}`, {
    method: "DELETE",
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao excluir relatório")
  }

  return response.json()
}

// Hooks
export function useReportsQuery(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.list(filters),
    queryFn: () => fetchReports(filters),
    placeholderData: (previousData) => previousData,
  })
}

export function usePendingReportsQuery() {
  return useQuery({
    queryKey: reportKeys.pending(),
    queryFn: fetchPendingReports,
  })
}

export function useReportQuery(id: string) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => fetchReport(id),
    enabled: !!id,
  })
}

export function useCreateReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() })
      queryClient.invalidateQueries({ queryKey: reportKeys.pending() })
    },
  })
}

export function useUpdateReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateReport(id, "update", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() })
      queryClient.invalidateQueries({ queryKey: reportKeys.detail(variables.id) })
    },
  })
}

export function useSubmitReportForReviewMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => updateReport(id, "submit_for_review"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
    },
  })
}

export function useDeleteReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() })
      queryClient.invalidateQueries({ queryKey: reportKeys.pending() })
    },
  })
}
