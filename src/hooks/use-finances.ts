"use client"

import * as React from "react"
import * as financesApi from "@/lib/api/finances"
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from "@/lib/api/finances"

export type { Transaction, CreateTransactionInput, UpdateTransactionInput }

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
    balance: 0, income: 0, expenses: 0, pending: 0,
  })
  const [monthlyData, setMonthlyData] = React.useState<MonthlyData[]>([])
  const [revenueSources, setRevenueSources] = React.useState<RevenueSource[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [txResponse, summary] = await Promise.all([
        financesApi.listTransactions({ limit: 500 }),
        financesApi.getSummary(),
      ])

      const txs = txResponse.data || []
      setTransactions(txs)

      setBalanceData({
        balance: summary.balance,
        income: summary.totalIncome,
        expenses: summary.totalExpenses,
        pending: summary.pendingReceivables + summary.pendingPayables,
      })

      const now = new Date()
      const months: MonthlyData[] = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString("pt-BR", { month: "short" })
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const monthIncome = txs
          .filter((t) => {
            const txDate = new Date(t.createdAt)
            return t.type === "income" && t.status === "paid" && txDate >= monthStart && txDate <= monthEnd
          })
          .reduce((sum, t) => sum + t.amount, 0)

        const monthExpenses = txs
          .filter((t) => {
            const txDate = new Date(t.createdAt)
            return t.type === "expense" && t.status === "paid" && txDate >= monthStart && txDate <= monthEnd
          })
          .reduce((sum, t) => sum + t.amount, 0)

        months.push({
          month: monthKey.charAt(0).toUpperCase() + monthKey.slice(1),
          income: monthIncome,
          expenses: monthExpenses,
        })
      }
      setMonthlyData(months)

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
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const createTransaction = React.useCallback(
    async (input: CreateTransactionInput) => {
      const data = await financesApi.createTransaction(input)
      await fetchData()
      return data
    },
    [fetchData]
  )

  const updateTransaction = React.useCallback(
    async (id: string, updates: UpdateTransactionInput) => {
      const data = await financesApi.updateTransaction(id, updates)
      await fetchData()
      return data
    },
    [fetchData]
  )

  const deleteTransaction = React.useCallback(
    async (id: string) => {
      await financesApi.deleteTransaction(id)
      await fetchData()
    },
    [fetchData]
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
