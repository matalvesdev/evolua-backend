import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as financesApi from "@/lib/api/finances"
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from "@/lib/api/finances"

export type { Transaction, CreateTransactionInput, UpdateTransactionInput }

export interface FinancialStats {
  totalIncome: number
  totalExpense: number
  balance: number
}

interface UseTransactionsOptions {
  type?: string
  status?: string
  patientId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export function useTransactions(options?: UseTransactionsOptions) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", options],
    queryFn: () => financesApi.listTransactions(options),
  })

  const transactions = data?.data ?? []

  const createTransaction = useMutation({
    mutationFn: (input: CreateTransactionInput) => financesApi.createTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["financial-stats"] })
    },
  })

  const updateTransaction = useMutation({
    mutationFn: ({ id, ...updates }: UpdateTransactionInput & { id: string }) =>
      financesApi.updateTransaction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["financial-stats"] })
    },
  })

  const deleteTransaction = useMutation({
    mutationFn: (id: string) => financesApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["financial-stats"] })
    },
  })

  const markAsPaid = useMutation({
    mutationFn: (id: string) =>
      financesApi.updateTransaction(id, {
        status: "completed",
        paidAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["financial-stats"] })
    },
  })

  return {
    transactions,
    loading: isLoading,
    total: data?.total ?? 0,
    createTransaction: createTransaction.mutateAsync,
    updateTransaction: updateTransaction.mutateAsync,
    deleteTransaction: deleteTransaction.mutateAsync,
    markAsPaid: markAsPaid.mutateAsync,
    isCreating: createTransaction.isPending,
    isUpdating: updateTransaction.isPending,
    isDeleting: deleteTransaction.isPending,
  }
}

export function useFinancialStats() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["financial-stats"],
    queryFn: () => financesApi.getSummary(),
  })

  const stats: FinancialStats | undefined = summary
    ? {
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        balance: summary.balance,
      }
    : undefined

  return { stats, loading: isLoading }
}
