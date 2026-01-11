// ============================================================================
// APPOINTMENT ENTITY
// ============================================================================

import type { AppointmentType, AppointmentStatus, CancellationReason, CancelledBy } from "../types"

export interface Appointment {
  id: string
  clinicId: string
  patientId: string
  patientName: string
  therapistId: string
  therapistName: string
  dateTime: Date
  duration: number // em minutos
  type: AppointmentType
  status: AppointmentStatus
  notes?: string
  cancellationReason?: CancellationReason
  cancellationNotes?: string
  cancelledBy?: CancelledBy
  cancelledAt?: Date
  confirmedAt?: Date
  startedAt?: Date
  completedAt?: Date
  sessionNotes?: string
  createdAt: Date
  updatedAt: Date
}
