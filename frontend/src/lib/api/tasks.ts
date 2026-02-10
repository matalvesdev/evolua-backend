// ============================================================================
// TASKS API
// ============================================================================

import { api } from "./client"

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Task {
  id: string
  clinicId: string
  userId: string
  title: string
  description?: string
  type: "task" | "reminder"
  priority: "low" | "medium" | "high"
  status: "pending" | "completed" | "cancelled"
  dueDate?: string
  completedAt?: string
  patientId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  type: "task" | "reminder"
  priority?: "low" | "medium" | "high"
  dueDate?: string
  patientId?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: "pending" | "completed" | "cancelled"
  priority?: "low" | "medium" | "high"
  dueDate?: string
  completed?: boolean
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return api.post<Task>("/tasks", input)
}

export async function listTasks(params?: {
  type?: string
  status?: string
  priority?: string
  patientId?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Task>> {
  const query = new URLSearchParams()
  if (params?.type) query.set("type", params.type)
  if (params?.status) query.set("status", params.status)
  if (params?.priority) query.set("priority", params.priority)
  if (params?.patientId) query.set("patientId", params.patientId)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))

  const qs = query.toString()
  return api.get<PaginatedResponse<Task>>(`/tasks${qs ? `?${qs}` : ""}`)
}

export async function getTask(id: string): Promise<Task> {
  return api.get<Task>(`/tasks/${id}`)
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return api.patch<Task>(`/tasks/${id}`, input)
}

export async function deleteTask(id: string): Promise<void> {
  return api.delete(`/tasks/${id}`)
}
