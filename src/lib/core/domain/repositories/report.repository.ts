// ============================================================================
// REPORT REPOSITORY INTERFACE
// ============================================================================

import type { Report } from "../entities/report"
import type { ReportStatus, ReportType } from "../types"

export interface ReportSearchFilters {
  clinicId?: string
  patientId?: string
  therapistId?: string
  type?: ReportType
  status?: ReportStatus
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface IReportRepository {
  findById(id: string): Promise<Report | null>
  findByClinicId(clinicId: string, filters?: ReportSearchFilters): Promise<{ reports: Report[]; total: number }>
  findByPatientId(patientId: string, filters?: ReportSearchFilters): Promise<{ reports: Report[]; total: number }>
  findByTherapistId(therapistId: string, filters?: ReportSearchFilters): Promise<{ reports: Report[]; total: number }>
  findPending(therapistId: string): Promise<Report[]>
  create(report: Omit<Report, "id" | "createdAt" | "updatedAt">): Promise<Report>
  update(id: string, data: Partial<Report>): Promise<Report>
  delete(id: string): Promise<void>
  submitForReview(id: string): Promise<Report>
  review(id: string, reviewedBy: string, notes?: string): Promise<Report>
  approve(id: string, approvedBy: string): Promise<Report>
  markAsSent(id: string, sentTo: string[]): Promise<Report>
}
