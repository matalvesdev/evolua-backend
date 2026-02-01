// ============================================================================
// PATIENT DTOs
// ============================================================================

import type { PatientStatus } from "../../domain/types"
import type { Patient } from "../../domain/entities/patient"

export interface CreatePatientInput {
  name: string
  email?: string
  phone?: string
  birthDate?: string
  cpf?: string
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zipCode?: string
  }
  medicalHistory?: {
    diagnosis?: string[]
    medications?: string[]
    allergies?: string[]
    notes?: string
  }
  therapistId?: string
}

export interface UpdatePatientInput {
  id: string
  name?: string
  email?: string
  phone?: string
  birthDate?: string
  cpf?: string
  status?: PatientStatus
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zipCode?: string
  }
  medicalHistory?: {
    diagnosis?: string[]
    medications?: string[]
    allergies?: string[]
    notes?: string
  }
  therapistId?: string
}

export interface PatientOutput {
  success: boolean
  patient?: Patient
  error?: string
}

export interface PatientListOutput {
  success: boolean
  patients: Patient[]
  total: number
  error?: string
}

export interface SearchPatientsInput {
  clinicId?: string
  therapistId?: string
  status?: PatientStatus
  search?: string
  page?: number
  limit?: number
}

export interface DischargePatientInput {
  id: string
  reason: string
  notes?: string
}

export interface ChangePatientStatusInput {
  id: string
  status: PatientStatus
}
