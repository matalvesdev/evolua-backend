// ============================================================================
// PATIENTS API — alinhado com o backend (CreatePatientDto / UpdatePatientDto)
// ============================================================================

import { api } from "./client"

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PatientAddress {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
}

export interface PatientMedicalHistory {
  diagnosis?: string[]
  medications?: string[]
  allergies?: string[]
  notes?: string
}

export interface Patient {
  id: string
  clinicId: string
  name: string
  email?: string
  phone?: string
  cpf?: string
  birthDate?: string
  status: string
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  therapistId?: string
  address?: PatientAddress | null
  medicalHistory?: PatientMedicalHistory | null
  startDate?: string
  dischargeDate?: string
  dischargeReason?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePatientInput {
  name: string
  email?: string
  phone?: string
  birthDate?: string
  cpf?: string
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  therapistId?: string
  address?: PatientAddress
  medicalHistory?: PatientMedicalHistory
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  return api.post<Patient>("/patients", input)
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<Patient> {
  return api.patch<Patient>(`/patients/${id}`, input)
}

export async function getPatient(id: string): Promise<Patient> {
  return api.get<Patient>(`/patients/${id}`)
}

export async function listPatients(params?: {
  search?: string
  status?: string
  therapistId?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Patient>> {
  const query = new URLSearchParams()
  if (params?.search) query.set("search", params.search)
  if (params?.status) query.set("status", params.status)
  if (params?.therapistId) query.set("therapistId", params.therapistId)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))

  const qs = query.toString()
  return api.get<PaginatedResponse<Patient>>(`/patients${qs ? `?${qs}` : ""}`)
}

export async function deletePatient(id: string): Promise<void> {
  return api.delete(`/patients/${id}`)
}

export async function changePatientStatus(id: string, status: string, reason?: string): Promise<Patient> {
  return api.patch<Patient>(`/patients/${id}/status`, { status, reason })
}
