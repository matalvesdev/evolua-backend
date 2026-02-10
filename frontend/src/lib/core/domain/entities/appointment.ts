import type { AppointmentType, AppointmentStatus, CancellationReason, CancelledBy } from "../types"

export interface Appointment {
  id: string
  clinicId: string
  patientId: string
  therapistId: string
  type: AppointmentType
  status: AppointmentStatus
  dateTime: string
  duration: number
  sessionNotes?: string
  cancellationReason?: CancellationReason
  cancelledBy?: CancelledBy
  cancellationNotes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentInput {
  patientId: string
  therapistId?: string
  type: AppointmentType
  dateTime: string
  duration?: number
  sessionNotes?: string
}
