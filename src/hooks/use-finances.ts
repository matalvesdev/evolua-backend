"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type Transaction = Database["public"]["Tables"]["financial_transactions"]["Row"]
type TransactionInsert = Database["public"]["Tables"]["financial_transactions"]["Insert"]
type TransactionUpdate = Database["public"]["Tables"]["financial_transactions"]["Update"]

export interface BalanceData {
  balance: number
  income: number
  expenses: number
  pending: number
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
}

export interface RevenueSource {
  name: string
  value: number
  color: string
}

const CATEGORY_COLORS: Record<string, string> = {
  session: "#10b981",
  evaluation: "#3b82f6",
  package: "#8b5cf6",
  product: "#f59e0b",
  other: "#6b7280",
  salary: "#ef4444",
  rent: "#f97316",
  supplies: "#84cc16",
  marketing: "#ec4899",
  utilities: "#14b8a6",
}

export function useFinances() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [balanceData, setBalanceData] = React.useState<BalanceData>({
    balance: 0,
    income: 0,
    expenses: 0,
    pending: 0,
  })
  const [monthlyData, setMonthlyData] = React.useState<MonthlyData[]>([])
  const [revenueSources, setRevenueSources] = React.useState<RevenueSource[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const supabase = React.useMemo(() => createClient(), [])

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all transactions
      const { data, error: fetchError } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      const txs = data || []
      setTransactions(txs)

      // Calculate balance data
      const income = txs
        .filter((t) => t.type === "income" && t.status === "paid")
        .reduce((sum, t) => sum + t.amount, 0)

      const expenses = txs
        .filter((t) => t.type === "expense" && t.status === "paid")
        .reduce((sum, t) => sum + t.amount, 0)

      const pending = txs
        .filter((t) => t.status === "pending")
        .reduce((sum, t) => sum + t.amount, 0)

      setBalanceData({
        balance: income - expenses,
        income,
        expenses,
        pending,
      })

      // Calculate monthly data (last 6 months)
      const now = new Date()
      const months: MonthlyData[] = []
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString("pt-BR", { month: "short" })
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const monthIncome = txs
          .filter((t) => {
            const txDate = new Date(t.created_at)
            return (
              t.type === "income" &&
              t.status === "paid" &&
              txDate >= monthStart &&
              txDate <= monthEnd
            )
          })
          .reduce((sum, t) => sum + t.amount, 0)

        const monthExpenses = txs
          .filter((t) => {
            const txDate = new Date(t.created_at)
            return (
              t.type === "expense" &&
              t.status === "paid" &&
              txDate >= monthStart &&
              txDate <= monthEnd
            )
          })
          .reduce((sum, t) => sum + t.amount, 0)

        months.push({
          month: monthKey.charAt(0).toUpperCase() + monthKey.slice(1),
          income: monthIncome,
          expenses: monthExpenses,
        })
      }
      setMonthlyData(months)

      // Calculate revenue sources by category
      const incomeByCategory = txs
        .filter((t) => t.type === "income" && t.status === "paid")
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount
          return acc
        }, {} as Record<string, number>)

      const sources: RevenueSource[] = Object.entries(incomeByCategory).map(
        ([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: CATEGORY_COLORS[name] || "#6b7280",
        })
      )
      setRevenueSources(sources)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados financeiros")
    } finally {
      setLoading(false)
    }
  }, [supabase])

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

  return {
    balanceData,
    monthlyData,
    revenueSources,
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refreshData: fetchData,
  }
}
