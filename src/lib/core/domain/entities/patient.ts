import type { PatientStatus } from "../types"

export interface Patient {
  id: string
  clinicId: string
  fullName: string
  email?: string
  phone?: string
  cpf?: string
  dateOfBirth?: string
  gender?: string
  status: PatientStatus
  therapistId?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePatientInput {
  fullName: string
  email?: string
  phone?: string
  cpf?: string
  dateOfBirth?: string
  gender?: string
  therapistId?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {
  id: string
}
