// ============================================================================
// PATIENT ENTITY
// ============================================================================

import type { PatientStatus } from "../types"

export interface Patient {
  id: string
  clinicId: string
  name: string
  email?: string
  phone?: string
  birthDate?: Date
  cpf?: string
  status: PatientStatus
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
  startDate?: Date
  dischargeDate?: Date
  dischargeReason?: string
  createdAt: Date
  updatedAt: Date
}
