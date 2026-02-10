// ============================================================================
// MESSAGES API — alinhado com o backend (CreateMessageDto)
// ============================================================================

import { api } from "./client"

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Message {
  id: string
  clinicId: string
  patientId: string
  therapistId: string
  content: string
  templateType: string
  recipientPhone: string
  recipientName: string
  channel: string
  sentAt: string
  createdAt: string
}

export interface CreateMessageInput {
  content: string
  templateType: 'reminder' | 'activity' | 'feedback' | 'free'
  recipientPhone: string
  recipientName: string
  channel?: string
}

export async function createMessage(patientId: string, input: CreateMessageInput): Promise<Message> {
  return api.post<Message>(`/patients/${patientId}/messages`, input)
}

export async function listMessages(patientId: string, params?: {
  type?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Message>> {
  const query = new URLSearchParams()
  if (params?.type) query.set("type", params.type)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))
  const qs = query.toString()
  return api.get<PaginatedResponse<Message>>(`/patients/${patientId}/messages${qs ? `?${qs}` : ""}`)
}
