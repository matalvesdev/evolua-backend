// ============================================================================
// PATIENT REPOSITORY INTERFACE
// ============================================================================

import type { Patient } from "../entities/patient"
import type { PatientStatus } from "../types"

export interface PatientSearchFilters {
  clinicId?: string
  therapistId?: string
  status?: PatientStatus
  search?: string
  page?: number
  limit?: number
}

export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>
  findByClinicId(clinicId: string, filters?: PatientSearchFilters): Promise<{ patients: Patient[]; total: number }>
  create(patient: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<Patient>
  update(id: string, data: Partial<Patient>): Promise<Patient>
  delete(id: string): Promise<void>
  changeStatus(id: string, status: PatientStatus): Promise<Patient>
  discharge(id: string, reason: string, notes?: string): Promise<Patient>
}
