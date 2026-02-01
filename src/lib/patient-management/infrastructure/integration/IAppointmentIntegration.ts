// ============================================================================
// APPOINTMENT INTEGRATION INTERFACE
// Defines the contract for integrating patient data with the appointment system
// ============================================================================

import type { Appointment } from '../../../core/domain/entities/appointment'

export interface AppointmentLinkData {
  patientId: string
  appointmentId: string
  linkedAt: Date
  linkedBy: string
}

export interface PatientAppointmentSyncData {
  patientId: string
  patientName: string
  patientPhone?: string
  patientEmail?: string
  patientStatus: string
  lastSyncedAt: Date
}

export interface IAppointmentIntegration {
  /**
   * Links a patient to an appointment
   * @param patientId - The patient identifier
   * @param appointmentId - The appointment identifier
   * @returns Promise resolving to the link data
   */
  linkPatientToAppointment(patientId: string, appointmentId: string): Promise<AppointmentLinkData>

  /**
   * Retrieves all appointments for a specific patient
   * @param patientId - The patient identifier
   * @returns Promise resolving to array of appointments
   */
  getPatientAppointments(patientId: string): Promise<Appointment[]>

  /**
   * Synchronizes patient data with the appointment system
   * @param patientId - The patient identifier
   * @returns Promise resolving to sync confirmation data
   */
  syncPatientData(patientId: string): Promise<PatientAppointmentSyncData>

  /**
   * Unlinking a patient from an appointment
   * @param patientId - The patient identifier
   * @param appointmentId - The appointment identifier
   * @returns Promise resolving when unlink is complete
   */
  unlinkPatientFromAppointment(patientId: string, appointmentId: string): Promise<void>

  /**
   * Validates if a patient can be scheduled for appointments
   * @param patientId - The patient identifier
   * @returns Promise resolving to boolean indicating if scheduling is allowed
   */
  canScheduleAppointment(patientId: string): Promise<boolean>
}
