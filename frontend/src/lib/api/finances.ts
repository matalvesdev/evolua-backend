// ============================================================================
// FINANCES API
// ============================================================================

import { api } from "./client"

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Transaction {
  id: string
  clinicId: string
  userId: string
  type: "income" | "expense"
  category: string
  description?: string
  amount: number
  paymentMethod?: string
  status: "pending" | "completed" | "cancelled" | "overdue"
  dueDate: string
  paidAt?: string
  patientId?: string
  appointmentId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTransactionInput {
  type: "income" | "expense"
  category: string
  description?: string
  amount: number
  paymentMethod?: string
  dueDate?: string
  patientId?: string
  appointmentId?: string
  notes?: string
}

export interface UpdateTransactionInput {
  category?: string
  description?: string
  amount?: number
  paymentMethod?: string
  status?: "pending" | "completed" | "cancelled" | "overdue"
  dueDate?: string
  paidAt?: string
  notes?: string
}

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  balance: number
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return api.post<Transaction>("/finances", input)
}

export async function listTransactions(params?: {
  type?: string
  status?: string
  patientId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Transaction>> {
  const query = new URLSearchParams()
  if (params?.type) query.set("type", params.type)
  if (params?.status) query.set("status", params.status)
  if (params?.patientId) query.set("patientId", params.patientId)
  if (params?.startDate) query.set("startDate", params.startDate)
  if (params?.endDate) query.set("endDate", params.endDate)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))

  const qs = query.toString()
  return api.get<PaginatedResponse<Transaction>>(`/finances${qs ? `?${qs}` : ""}`)
}

export async function getTransaction(id: string): Promise<Transaction> {
  return api.get<Transaction>(`/finances/${id}`)
}

export async function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  return api.patch<Transaction>(`/finances/${id}`, input)
}

export async function deleteTransaction(id: string): Promise<void> {
  return api.delete(`/finances/${id}`)
}

export async function getSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
  const query = new URLSearchParams()
  if (startDate) query.set("startDate", startDate)
  if (endDate) query.set("endDate", endDate)

  const qs = query.toString()
  return api.get<FinancialSummary>(`/finances/summary${qs ? `?${qs}` : ""}`)
}
