// ============================================================================
// SUPABASE PATIENT REPOSITORY
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js"
import type { IPatientRepository, PatientSearchFilters } from "../../domain/repositories/patient.repository"
import type { Patient } from "../../domain/entities/patient"
import type { PatientStatus } from "../../domain/types"

export class SupabasePatientRepository implements IPatientRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Patient | null> {
    const { data, error } = await this.supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data)
  }

  async findByClinicId(
    clinicId: string,
    filters?: PatientSearchFilters
  ): Promise<{ patients: Patient[]; total: number }> {
    let query = this.supabase.from("patients").select("*", { count: "exact" })

    if (clinicId) {
      query = query.eq("clinic_id", clinicId)
    }

    if (filters?.therapistId) {
      query = query.eq("therapist_id", filters.therapistId)
    }

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`)
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order("name")

    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    return {
      patients: (data ?? []).map(this.mapToEntity),
      total: count ?? 0,
    }
  }

  async create(patient: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<Patient> {
    const { data, error } = await this.supabase
      .from("patients")
      .insert({
        clinic_id: patient.clinicId,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        birth_date: patient.birthDate?.toISOString(),
        cpf: patient.cpf,
        status: patient.status,
        guardian_name: patient.guardianName,
        guardian_phone: patient.guardianPhone,
        guardian_relationship: patient.guardianRelationship,
        address: patient.address,
        medical_history: patient.medicalHistory,
        therapist_id: patient.therapistId,
        start_date: patient.startDate?.toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  async update(id: string, patientData: Partial<Patient>): Promise<Patient> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (patientData.name !== undefined) updateData.name = patientData.name
    if (patientData.email !== undefined) updateData.email = patientData.email
    if (patientData.phone !== undefined) updateData.phone = patientData.phone
    if (patientData.birthDate !== undefined) updateData.birth_date = patientData.birthDate?.toISOString()
    if (patientData.cpf !== undefined) updateData.cpf = patientData.cpf
    if (patientData.status !== undefined) updateData.status = patientData.status
    if (patientData.guardianName !== undefined) updateData.guardian_name = patientData.guardianName
    if (patientData.guardianPhone !== undefined) updateData.guardian_phone = patientData.guardianPhone
    if (patientData.guardianRelationship !== undefined) updateData.guardian_relationship = patientData.guardianRelationship
    if (patientData.address !== undefined) updateData.address = patientData.address
    if (patientData.medicalHistory !== undefined) updateData.medical_history = patientData.medicalHistory
    if (patientData.therapistId !== undefined) updateData.therapist_id = patientData.therapistId

    const { data, error } = await this.supabase
      .from("patients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("patients").delete().eq("id", id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async changeStatus(id: string, status: PatientStatus): Promise<Patient> {
    return this.update(id, { status })
  }

  async discharge(id: string, reason: string, notes?: string): Promise<Patient> {
    const { data, error } = await this.supabase
      .from("patients")
      .update({
        status: "discharged",
        discharge_date: new Date().toISOString(),
        discharge_reason: reason,
        discharge_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  private mapToEntity(data: Record<string, unknown>): Patient {
    return {
      id: data.id as string,
      clinicId: data.clinic_id as string,
      name: data.name as string,
      email: data.email as string | undefined,
      phone: data.phone as string | undefined,
      birthDate: data.birth_date ? new Date(data.birth_date as string) : undefined,
      cpf: data.cpf as string | undefined,
      status: data.status as PatientStatus,
      guardianName: data.guardian_name as string | undefined,
      guardianPhone: data.guardian_phone as string | undefined,
      guardianRelationship: data.guardian_relationship as string | undefined,
      address: data.address as Patient["address"],
      medicalHistory: data.medical_history as Patient["medicalHistory"],
      therapistId: data.therapist_id as string | undefined,
      startDate: data.start_date ? new Date(data.start_date as string) : undefined,
      dischargeDate: data.discharge_date ? new Date(data.discharge_date as string) : undefined,
      dischargeReason: data.discharge_reason as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    }
  }
}
