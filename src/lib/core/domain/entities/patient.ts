import type { PatientStatus } from "../types"

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
  status: PatientStatus
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  therapistId?: string
  address?: PatientAddress | null
  medicalHistory?: PatientMedicalHistory | null
  createdAt: string
  updatedAt: string
}

export interface CreatePatientInput {
  name: string
  email?: string
  phone?: string
  cpf?: string
  birthDate?: string
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  therapistId?: string
  address?: PatientAddress
  medicalHistory?: PatientMedicalHistory
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {
  id: string
}
