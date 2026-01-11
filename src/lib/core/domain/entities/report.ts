// ============================================================================
// REPORT ENTITY
// ============================================================================

import type { ReportType, ReportStatus } from "../types"

export interface Report {
  id: string
  clinicId: string
  patientId: string
  patientName: string
  therapistId: string
  therapistName: string
  therapistCrfa: string
  type: ReportType
  status: ReportStatus
  title: string
  content: string
  period?: {
    startDate: Date
    endDate: Date
  }
  appointmentId?: string
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
  approvedBy?: string
  approvedAt?: Date
  sentAt?: Date
  sentTo?: string[]
  createdAt: Date
  updatedAt: Date
}
