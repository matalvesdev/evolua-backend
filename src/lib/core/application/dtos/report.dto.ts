// ============================================================================
// REPORT DTOs
// ============================================================================

import type { ReportType, ReportStatus } from "../../domain/types"
import type { Report } from "../../domain/entities/report"

export interface CreateReportInput {
  patientId: string
  therapistId: string
  type: ReportType
  title: string
  content: string
  period?: {
    startDate: string
    endDate: string
  }
  appointmentId?: string
}

export interface UpdateReportInput {
  id: string
  title?: string
  content?: string
  period?: {
    startDate: string
    endDate: string
  }
}

export interface ReportOutput {
  success: boolean
  report?: Report
  error?: string
}

export interface ReportListOutput {
  success: boolean
  reports: Report[]
  total: number
  error?: string
}

export interface SearchReportsInput {
  clinicId?: string
  patientId?: string
  therapistId?: string
  type?: ReportType
  status?: ReportStatus
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface SubmitReportForReviewInput {
  id: string
}
