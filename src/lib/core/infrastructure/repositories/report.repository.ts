// ============================================================================
// SUPABASE REPORT REPOSITORY
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js"
import type { IReportRepository, ReportSearchFilters } from "../../domain/repositories/report.repository"
import type { Report } from "../../domain/entities/report"
import type { ReportStatus } from "../../domain/types"

export class SupabaseReportRepository implements IReportRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Report | null> {
    const { data, error } = await this.supabase
      .from("reports")
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
    filters?: ReportSearchFilters
  ): Promise<{ reports: Report[]; total: number }> {
    return this.findWithFilters({ ...filters, clinicId })
  }

  async findByPatientId(
    patientId: string,
    filters?: ReportSearchFilters
  ): Promise<{ reports: Report[]; total: number }> {
    return this.findWithFilters({ ...filters, patientId })
  }

  async findByTherapistId(
    therapistId: string,
    filters?: ReportSearchFilters
  ): Promise<{ reports: Report[]; total: number }> {
    return this.findWithFilters({ ...filters, therapistId })
  }

  async findPending(therapistId: string): Promise<Report[]> {
    const { data, error } = await this.supabase
      .from("reports")
      .select("*")
      .eq("therapist_id", therapistId)
      .in("status", ["draft", "pending_review"])
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map(this.mapToEntity)
  }

  private async findWithFilters(
    filters: ReportSearchFilters
  ): Promise<{ reports: Report[]; total: number }> {
    let query = this.supabase.from("reports").select("*", { count: "exact" })

    if (filters.clinicId) {
      query = query.eq("clinic_id", filters.clinicId)
    }

    if (filters.patientId) {
      query = query.eq("patient_id", filters.patientId)
    }

    if (filters.therapistId) {
      query = query.eq("therapist_id", filters.therapistId)
    }

    if (filters.type) {
      query = query.eq("type", filters.type)
    }

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate.toISOString())
    }

    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate.toISOString())
    }

    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order("created_at", { ascending: false })

    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    return {
      reports: (data ?? []).map(this.mapToEntity),
      total: count ?? 0,
    }
  }

  async create(report: Omit<Report, "id" | "createdAt" | "updatedAt">): Promise<Report> {
    const { data, error } = await this.supabase
      .from("reports")
      .insert({
        clinic_id: report.clinicId,
        patient_id: report.patientId,
        patient_name: report.patientName,
        therapist_id: report.therapistId,
        therapist_name: report.therapistName,
        therapist_crfa: report.therapistCrfa,
        type: report.type,
        status: report.status,
        title: report.title,
        content: report.content,
        period_start: report.period?.startDate?.toISOString(),
        period_end: report.period?.endDate?.toISOString(),
        appointment_id: report.appointmentId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.mapToEntity(data)
  }

  async update(id: string, reportData: Partial<Report>): Promise<Report> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (reportData.title !== undefined) updateData.title = reportData.title
    if (reportData.content !== undefined) updateData.content = reportData.content
    if (reportData.status !== undefined) updateData.status = reportData.status
    if (reportData.period?.startDate) updateData.period_start = reportData.period.startDate.toISOString()
    if (reportData.period?.endDate) updateData.period_end = reportData.period.endDate.toISOString()

    const { data, error } = await this.supabase
      .from("reports")
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
    const { error } = await this.supabase.from("reports").delete().eq("id", id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async submitForReview(id: string): Promise<Report> {
    const { data, error } = await this.supabase
      .from("reports")
      .update({
        status: "pending_review",
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

  async review(id: string, reviewedBy: string, notes?: string): Promise<Report> {
    const { data, error } = await this.supabase
      .from("reports")
      .update({
        status: "reviewed",
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
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

  async approve(id: string, approvedBy: string): Promise<Report> {
    const { data, error } = await this.supabase
      .from("reports")
      .update({
        status: "approved",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
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

  async markAsSent(id: string, sentTo: string[]): Promise<Report> {
    const { data, error } = await this.supabase
      .from("reports")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to: sentTo,
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

  private mapToEntity(data: Record<string, unknown>): Report {
    return {
      id: data.id as string,
      clinicId: data.clinic_id as string,
      patientId: data.patient_id as string,
      patientName: data.patient_name as string,
      therapistId: data.therapist_id as string,
      therapistName: data.therapist_name as string,
      therapistCrfa: data.therapist_crfa as string,
      type: data.type as Report["type"],
      status: data.status as ReportStatus,
      title: data.title as string,
      content: data.content as string,
      period:
        data.period_start && data.period_end
          ? {
              startDate: new Date(data.period_start as string),
              endDate: new Date(data.period_end as string),
            }
          : undefined,
      appointmentId: data.appointment_id as string | undefined,
      reviewedBy: data.reviewed_by as string | undefined,
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at as string) : undefined,
      reviewNotes: data.review_notes as string | undefined,
      approvedBy: data.approved_by as string | undefined,
      approvedAt: data.approved_at ? new Date(data.approved_at as string) : undefined,
      sentAt: data.sent_at ? new Date(data.sent_at as string) : undefined,
      sentTo: data.sent_to as string[] | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    }
  }
}
