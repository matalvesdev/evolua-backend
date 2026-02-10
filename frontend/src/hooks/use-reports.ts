import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as reportsApi from "@/lib/api/reports"
import type { Report, CreateReportInput, UpdateReportInput } from "@/lib/api/reports"

export type { Report }

export function useReports(params?: {
  search?: string
  patientId?: string
  therapistId?: string
  type?: string
  status?: string
  page?: number
  limit?: number
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", params],
    queryFn: () => reportsApi.listReports(params),
  })

  return {
    reports: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error,
    refetch,
  }
}

export function useReport(id: string) {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", id],
    queryFn: () => reportsApi.getReport(id),
    enabled: !!id,
  })

  return { report, loading: isLoading, error }
}

export function usePatientReports(patientId: string) {
  return useReports({ patientId })
}

export function usePendingReports() {
  return useReports({ status: "pending_review" })
}

export function useReportMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: CreateReportInput) => reportsApi.createReport(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: UpdateReportInput & { id: string }) =>
      reportsApi.updateReport(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      queryClient.invalidateQueries({ queryKey: ["report"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.deleteReport(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })

  const submitMutation = useMutation({
    mutationFn: (id: string) => reportsApi.submitReportForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      queryClient.invalidateQueries({ queryKey: ["report"] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => reportsApi.approveReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      queryClient.invalidateQueries({ queryKey: ["report"] })
    },
  })

  return {
    createReport: createMutation.mutateAsync,
    updateReport: updateMutation.mutateAsync,
    deleteReport: deleteMutation.mutateAsync,
    submitForReview: submitMutation.mutateAsync,
    approveReport: approveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
