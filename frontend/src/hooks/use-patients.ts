import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as patientsApi from "@/lib/api/patients"
import type { Patient, CreatePatientInput, UpdatePatientInput } from "@/lib/api/patients"

export type { Patient }

export function usePatients(params?: {
  search?: string
  status?: string
  therapistId?: string
  page?: number
  limit?: number
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["patients", params],
    queryFn: () => patientsApi.listPatients(params),
  })

  return {
    patients: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    loading: isLoading,
    error,
    refetch,
  }
}

export function usePatient(id: string) {
  const { data: patient, isLoading, error, refetch } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsApi.getPatient(id),
    enabled: !!id,
  })

  return { patient, loading: isLoading, error, refetch }
}

export function usePatientMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: CreatePatientInput) => patientsApi.createPatient(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: UpdatePatientInput & { id: string }) =>
      patientsApi.updatePatient(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      queryClient.invalidateQueries({ queryKey: ["patient"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientsApi.deletePatient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  })

  const remove = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro" }
    }
  }

  const discharge = async (id: string, reason?: string) => {
    try {
      await patientsApi.changePatientStatus(id, "discharged", reason)
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      queryClient.invalidateQueries({ queryKey: ["patient", id] })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro" }
    }
  }

  const reactivate = async (id: string) => {
    try {
      await patientsApi.changePatientStatus(id, "active")
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      queryClient.invalidateQueries({ queryKey: ["patient", id] })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro" }
    }
  }

  return {
    createPatient: createMutation.mutateAsync,
    updatePatient: updateMutation.mutateAsync,
    deletePatient: deleteMutation.mutateAsync,
    remove,
    discharge,
    reactivate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  }
}
