// ============================================================================
// APPOINTMENT DTOs
// ============================================================================

import type { AppointmentType, AppointmentStatus, CancellationReason, CancelledBy } from "../../domain/types"
import type { Appointment } from "../../domain/entities/appointment"

export interface CreateAppointmentInput {
  patientId: string
  therapistId: string
  dateTime: string
  duration: number
  type: AppointmentType
  notes?: string
}

export interface AppointmentOutput {
  success: boolean
  appointment?: Appointment
  error?: string
}

export interface AppointmentListOutput {
  success: boolean
  appointments: Appointment[]
  total: number
  error?: string
}

export interface SearchAppointmentsInput {
  clinicId?: string
  patientId?: string
  therapistId?: string
  status?: AppointmentStatus
  type?: AppointmentType
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface CancelAppointmentInput {
  id: string
  reason: CancellationReason
  cancelledBy: CancelledBy
  notes?: string
}

export interface CompleteAppointmentInput {
  id: string
  sessionNotes?: string
}

export interface RescheduleAppointmentInput {
  id: string
  newDateTime: string
  newDuration?: number
}
