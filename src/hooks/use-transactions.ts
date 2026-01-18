"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type Transaction = Database["public"]["Tables"]["financial_transactions"]["Row"]
type TransactionInsert = Database["public"]["Tables"]["financial_transactions"]["Insert"]
type TransactionUpdate = Database["public"]["Tables"]["financial_transactions"]["Update"]

export interface TransactionsParams {
  period?: "all" | "30days" | "7days" | "today"
  status?: "all" | "paid" | "pending" | "overdue" | "cancelled"
  type?: "all" | "income" | "expense"
  patientSearch?: string
  page?: number
  pageSize?: number
}

export function useTransactions(params: TransactionsParams = {}) {
  const {
    period = "all",
    status = "all",
    type = "all",
    patientSearch = "",
    page = 1,
    pageSize = 10,
  } = params

  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const supabase = React.useMemo(() => createClient(), [])

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from("financial_transactions")
        .select("*", { count: "exact" })

      // Filter by period
      if (period !== "all") {
        const now = new Date()
        let startDate: Date

        switch (period) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case "7days":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case "30days":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0)
        }
        query = query.gte("created_at", startDate.toISOString())
      }

      // Filter by status
      if (status !== "all") {
        query = query.eq("status", status)
      }

      // Filter by type
      if (type !== "all") {
        query = query.eq("type", type)
      }

      // Filter by patient search
      if (patientSearch) {
        query = query.ilike("patient_name", `%${patientSearch}%`)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query
        .order("created_at", { ascending: false })
        .range(from, to)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setTransactions(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transações")
    } finally {
      setLoading(false)
    }
  }, [supabase, period, status, type, patientSearch, page, pageSize])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const createTransaction = React.useCallback(
    async (transaction: Omit<TransactionInsert, "clinic_id" | "therapist_id">) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error("Usuário não autenticado")

        const { data: userProfile } = await supabase
          .from("users")
          .select("clinic_id")
          .eq("id", userData.user.id)
          .single()

        if (!userProfile) throw new Error("Perfil não encontrado")

        const { data, error } = await supabase
          .from("financial_transactions")
          .insert({
            ...transaction,
            clinic_id: userProfile.clinic_id,
            therapist_id: userData.user.id,
          })
          .select()
          .single()

        if (error) throw error
        await fetchData()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar transação")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const updateTransaction = React.useCallback(
    async (id: string, updates: TransactionUpdate) => {
      try {
        const { data, error } = await supabase
          .from("financial_transactions")
          .update(updates)
          .eq("id", id)
          .select()
          .single()

        if (error) throw error
        await fetchData()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar transação")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const deleteTransaction = React.useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .eq("id", id)

        if (error) throw error
        await fetchData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao deletar transação")
        throw err
      }
    },
    [supabase, fetchData]
  )

  const markAsPaid = React.useCallback(
    async (id: string) => {
      return updateTransaction(id, {
        status: "paid",
        paid_date: new Date().toISOString(),
      })
    },
    [updateTransaction]
  )

  const markAsPending = React.useCallback(
    async (id: string) => {
      return updateTransaction(id, {
        status: "pending",
        paid_date: null,
      })
    },
    [updateTransaction]
  )

  const markAsOverdue = React.useCallback(
    async (id: string) => {
      return updateTransaction(id, { status: "overdue" })
    },
    [updateTransaction]
  )

  const cancelTransaction = React.useCallback(
    async (id: string) => {
      return updateTransaction(id, { status: "cancelled" })
    },
    [updateTransaction]
  )

  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    transactions,
    totalCount,
    totalPages,
    currentPage: page,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    markAsPaid,
    markAsPending,
    markAsOverdue,
    cancelTransaction,
    refreshData: fetchData,
  }
}
