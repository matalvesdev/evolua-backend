// ============================================================================
// APPOINTMENT REPOSITORY INTERFACE
// ============================================================================

import type { Appointment } from "../entities/appointment"
import type { AppointmentStatus, AppointmentType, CancellationReason, CancelledBy } from "../types"

export interface AppointmentSearchFilters {
  clinicId?: string
  patientId?: string
  therapistId?: string
  status?: AppointmentStatus
  type?: AppointmentType
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface IAppointmentRepository {
  findById(id: string): Promise<Appointment | null>
  findByClinicId(clinicId: string, filters?: AppointmentSearchFilters): Promise<{ appointments: Appointment[]; total: number }>
  findByPatientId(patientId: string, filters?: AppointmentSearchFilters): Promise<{ appointments: Appointment[]; total: number }>
  findByTherapistId(therapistId: string, filters?: AppointmentSearchFilters): Promise<{ appointments: Appointment[]; total: number }>
  create(appointment: Omit<Appointment, "id" | "createdAt" | "updatedAt">): Promise<Appointment>
  update(id: string, data: Partial<Appointment>): Promise<Appointment>
  delete(id: string): Promise<void>
  confirm(id: string): Promise<Appointment>
  start(id: string): Promise<Appointment>
  complete(id: string, sessionNotes?: string): Promise<Appointment>
  cancel(id: string, reason: CancellationReason, cancelledBy: CancelledBy, notes?: string): Promise<Appointment>
  reschedule(id: string, newDateTime: Date, newDuration?: number): Promise<Appointment>
}
