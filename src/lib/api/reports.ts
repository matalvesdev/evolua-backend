// ============================================================================
// REPORTS API
// ============================================================================

import { api } from "./client"

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Report {
  id: string
  clinicId: string
  patientId: string
  patientName: string
  therapistId: string
  therapistName: string
  type: string
  status: string
  title: string
  content?: string
  sentAt?: string | null
  sentTo?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateReportInput {
  patientId: string
  type: string
  title?: string
  content?: string
  appointmentId?: string
}

export interface UpdateReportInput {
  title?: string
  content?: string
  status?: string
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  return api.post<Report>("/reports", input)
}

export async function updateReport(id: string, input: UpdateReportInput): Promise<Report> {
  return api.patch<Report>(`/reports/${id}`, input)
}

export async function getReport(id: string): Promise<Report> {
  return api.get<Report>(`/reports/${id}`)
}

export async function listReports(params?: {
  search?: string
  patientId?: string
  therapistId?: string
  type?: string
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Report>> {
  const query = new URLSearchParams()
  if (params?.search) query.set("search", params.search)
  if (params?.patientId) query.set("patientId", params.patientId)
  if (params?.therapistId) query.set("therapistId", params.therapistId)
  if (params?.type) query.set("type", params.type)
  if (params?.status) query.set("status", params.status)
  if (params?.startDate) query.set("startDate", params.startDate)
  if (params?.endDate) query.set("endDate", params.endDate)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))

  const qs = query.toString()
  return api.get<PaginatedResponse<Report>>(`/reports${qs ? `?${qs}` : ""}`)
}

export async function submitReportForReview(id: string): Promise<Report> {
  return api.patch<Report>(`/reports/${id}/submit`, {})
}

export async function deleteReport(id: string): Promise<void> {
  return api.delete(`/reports/${id}`)
}
