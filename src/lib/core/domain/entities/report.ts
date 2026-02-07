import type { ReportType, ReportStatus } from "../types"

export interface Report {
  id: string
  clinicId: string
  patientId: string
  therapistId: string
  type: ReportType
  status: ReportStatus
  title: string
  content?: string
  createdAt: string
  updatedAt: string
}

export interface CreateReportInput {
  patientId: string
  type: ReportType
  title: string
  content?: string
}

export interface UpdateReportInput {
  id: string
  title?: string
  content?: string
  status?: ReportStatus
}
