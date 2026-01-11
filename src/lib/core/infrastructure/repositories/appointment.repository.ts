// ============================================================================
// SUPABASE APPOINTMENT REPOSITORY
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js"
import type { IAppointmentRepository, AppointmentSearchFilters } from "../../domain/repositories/appointment.repository"
import type { Appointment } from "../../domain/entities/appointment"
import type { AppointmentStatus, CancellationReason, CancelledBy } from "../../domain/types"

export class SupabaseAppointmentRepository implements IAppointmentRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Appointment | null> {
    const { data, error } = await this.supabase
      .from("appointments")
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
    filters?: AppointmentSearchFilters
  ): Promise<{ appointments: Appointment[]; total: number }> {
    return this.findWithFilters({ ...filters, clinicId })
  }

  async findByPatientId(
    patientId: string,
    filters?: AppointmentSearchFilters
  ): Promise<{ appointments: Appointment[]; total: number }> {
    return this.findWithFilters({ ...filters, patientId })
  }

  async findByTherapistId(
    therapistId: string,
    filters?: AppointmentSearchFilters
  ): Promise<{ appointments: Appointment[]; total: number }> {
    return this.findWithFilters({ ...filters, therapistId })
  }

  private async findWithFilters(
    filters: AppointmentSearchFilters
  ): Promise<{ appointments: Appointment[]; total: number }> {
    let query = this.supabase.from("appointments").select("*", { count: "exact" })

    if (filters.clinicId) {
      query = query.eq("clinic_id", filters.clinicId)
    }

    if (filters.patientId) {
      query = query.eq("patient_id", filters.patientId)
    }

    if (filters.therapistId) {
      query = query.eq("therapist_id", filters.therapistId)
    }

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.type) {
      query = query.eq("type", filters.type)
    }

    if (filters.startDate) {
      query = query.gte("date_time", filters.startDate.toISOString())
    }

    if (filters.endDate) {
      query = query.lte("date_time", filters.endDate.toISOString())
    }

    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order("date_time", { ascending: true })

    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    return {
      appointments: (data ?? []).map(this.mapToEntity),
      total: count ?? 0,
    }
  }

  async create(appointment: Omit<Appointment, "id" | "createdAt" | "updatedAt">): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from("appointments")
      .insert({
        clinic_id: appointment.clinicId,
        patient_id: appointment.patientId,
        patient_name: appointment.patientName,
        therapist_id: appointment.therapistId,
        therapist_name: appointment.therapistName,
        date_time: appointment.dateTime.toISOString(),
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status,
        notes: appointment.notes,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  async update(id: string, appointmentData: Partial<Appointment>): Promise<Appointment> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (appointmentData.dateTime) updateData.date_time = appointmentData.dateTime.toISOString()
    if (appointmentData.duration) updateData.duration = appointmentData.duration
    if (appointmentData.type) updateData.type = appointmentData.type
    if (appointmentData.status) updateData.status = appointmentData.status
    if (appointmentData.notes !== undefined) updateData.notes = appointmentData.notes
    if (appointmentData.sessionNotes !== undefined) updateData.session_notes = appointmentData.sessionNotes

    const { data, error } = await this.supabase
      .from("appointments")
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
    const { error } = await this.supabase.from("appointments").delete().eq("id", id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async confirm(id: string): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from("appointments")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
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

  async start(id: string): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from("appointments")
      .update({
        status: "in-progress",
        started_at: new Date().toISOString(),
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

  async complete(id: string, sessionNotes?: string): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from("appointments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        session_notes: sessionNotes,
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

  async cancel(
    id: string,
    reason: CancellationReason,
    cancelledBy: CancelledBy,
    notes?: string
  ): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        cancelled_by: cancelledBy,
        cancellation_notes: notes,
        cancelled_at: new Date().toISOString(),
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

  async reschedule(id: string, newDateTime: Date, newDuration?: number): Promise<Appointment> {
    const updateData: Record<string, unknown> = {
      date_time: newDateTime.toISOString(),
      status: "scheduled",
      updated_at: new Date().toISOString(),
    }

    if (newDuration) {
      updateData.duration = newDuration
    }

    const { data, error } = await this.supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  private mapToEntity(data: Record<string, unknown>): Appointment {
    return {
      id: data.id as string,
      clinicId: data.clinic_id as string,
      patientId: data.patient_id as string,
      patientName: data.patient_name as string,
      therapistId: data.therapist_id as string,
      therapistName: data.therapist_name as string,
      dateTime: new Date(data.date_time as string),
      duration: data.duration as number,
      type: data.type as Appointment["type"],
      status: data.status as AppointmentStatus,
      notes: data.notes as string | undefined,
      cancellationReason: data.cancellation_reason as CancellationReason | undefined,
      cancellationNotes: data.cancellation_notes as string | undefined,
      cancelledBy: data.cancelled_by as CancelledBy | undefined,
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at as string) : undefined,
      confirmedAt: data.confirmed_at ? new Date(data.confirmed_at as string) : undefined,
      startedAt: data.started_at ? new Date(data.started_at as string) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at as string) : undefined,
      sessionNotes: data.session_notes as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    }
  }
}
