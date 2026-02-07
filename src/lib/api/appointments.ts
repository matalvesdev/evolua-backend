// ============================================================================
// APPOINTMENTS API
// ============================================================================

import { api } from "./client"

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Appointment {
  id: string
  clinicId: string
  patientId: string
  therapistId: string
  type: string
  status: string
  dateTime: string
  duration: number
  sessionNotes?: string
  cancellationReason?: string
  cancelledBy?: string
  cancellationNotes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentInput {
  patientId: string
  therapistId?: string
  type: string
  dateTime: string
  duration?: number
  sessionNotes?: string
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  return api.post<Appointment>("/appointments", input)
}

export async function getAppointment(id: string): Promise<Appointment> {
  return api.get<Appointment>(`/appointments/${id}`)
}

export async function listAppointments(params?: {
  patientId?: string
  therapistId?: string
  status?: string
  type?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Appointment>> {
  const query = new URLSearchParams()
  if (params?.patientId) query.set("patientId", params.patientId)
  if (params?.therapistId) query.set("therapistId", params.therapistId)
  if (params?.status) query.set("status", params.status)
  if (params?.type) query.set("type", params.type)
  if (params?.startDate) query.set("startDate", params.startDate)
  if (params?.endDate) query.set("endDate", params.endDate)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))

  const qs = query.toString()
  return api.get<PaginatedResponse<Appointment>>(`/appointments${qs ? `?${qs}` : ""}`)
}

export async function confirmAppointment(id: string): Promise<Appointment> {
  return api.patch<Appointment>(`/appointments/${id}/confirm`, {})
}

export async function startAppointment(id: string): Promise<Appointment> {
  return api.patch<Appointment>(`/appointments/${id}/start`, {})
}

export async function completeAppointment(id: string, sessionNotes?: string): Promise<Appointment> {
  return api.patch<Appointment>(`/appointments/${id}/complete`, { sessionNotes })
}

export async function cancelAppointment(id: string, reason: string, cancelledBy: string, notes?: string): Promise<Appointment> {
  return api.patch<Appointment>(`/appointments/${id}/cancel`, { reason, cancelledBy, notes })
}

export async function rescheduleAppointment(id: string, newDateTime: string, newDuration?: number): Promise<Appointment> {
  return api.patch<Appointment>(`/appointments/${id}`, { dateTime: newDateTime, duration: newDuration })
}

export async function deleteAppointment(id: string): Promise<void> {
  return api.delete(`/appointments/${id}`)
}
