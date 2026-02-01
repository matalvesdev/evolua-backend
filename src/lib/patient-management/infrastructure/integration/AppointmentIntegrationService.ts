// ============================================================================
// APPOINTMENT INTEGRATION SERVICE
// Implements integration between patient management and appointment systems
// ============================================================================

import type { IAppointmentIntegration, AppointmentLinkData, PatientAppointmentSyncData } from './IAppointmentIntegration'
import type { IAppointmentRepository } from '../../../core/domain/repositories/appointment.repository'
import type { IPatientRepository } from '../repositories/IPatientRepository'
import type { Appointment } from '../../../core/domain/entities/appointment'
import type { AuditLogger } from '../services/AuditLogger'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'

export interface AppointmentIntegrationConfig {
  enableRealTimeSync: boolean
  syncRetryAttempts: number
  syncTimeoutMs: number
}

export class AppointmentIntegrationService implements IAppointmentIntegration {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly auditLogger: AuditLogger,
    private readonly config: AppointmentIntegrationConfig = {
      enableRealTimeSync: true,
      syncRetryAttempts: 3,
      syncTimeoutMs: 5000
    }
  ) {}

  async linkPatientToAppointment(patientId: string, appointmentId: string): Promise<AppointmentLinkData> {
    try {
      // Validate patient exists and can schedule appointments
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`)
      }

      if (!patient.canScheduleAppointment()) {
        throw new Error(`Patient ${patientId} cannot schedule appointments in current status: ${patient.status.value}`)
      }

      // Validate appointment exists
      const appointment = await this.appointmentRepository.findById(appointmentId)
      if (!appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`)
      }

      // Check if appointment is already linked to a different patient
      if (appointment.patientId && appointment.patientId !== patientId) {
        throw new Error(`Appointment ${appointmentId} is already linked to patient ${appointment.patientId}`)
      }

      // Update appointment with patient information
      await this.appointmentRepository.update(appointmentId, {
        patientId: patientId,
        patientName: patient.personalInfo.fullName.value,
        updatedAt: new Date()
      })

      const linkData: AppointmentLinkData = {
        patientId,
        appointmentId,
        linkedAt: new Date(),
        linkedBy: patient.createdBy.value
      }

      // Audit log the linking
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'LINK_APPOINTMENT',
        dataType: 'appointment_link',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { appointmentId, linkedAt: linkData.linkedAt }
      })

      // Sync patient data if real-time sync is enabled
      if (this.config.enableRealTimeSync) {
        await this.syncPatientData(patientId).catch(error => {
          // Log sync error but don't fail the linking operation
          console.error(`Failed to sync patient data after linking: ${error.message}`)
        })
      }

      return linkData
    } catch (error) {
      await this.handleIntegrationError('linkPatientToAppointment', error, { patientId, appointmentId })
      throw error
    }
  }

  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    try {
      // Validate patient exists
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`)
      }

      // Retrieve appointments for the patient
      const result = await this.appointmentRepository.findByPatientId(patientId)

      // Audit log the access
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'VIEW_APPOINTMENTS',
        dataType: 'appointments',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { appointmentCount: result.appointments.length }
      })

      return result.appointments
    } catch (error) {
      await this.handleIntegrationError('getPatientAppointments', error, { patientId })
      throw error
    }
  }

  async syncPatientData(patientId: string): Promise<PatientAppointmentSyncData> {
    try {
      // Retrieve patient data
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`)
      }

      // Get all appointments for the patient
      const appointments = await this.getPatientAppointments(patientId)

      // Update each appointment with current patient data
      const syncPromises = appointments.map(async (appointment) => {
        return this.appointmentRepository.update(appointment.id, {
          patientName: patient.personalInfo.fullName.value,
          updatedAt: new Date()
        })
      })

      // Execute sync with retry logic
      await this.executeWithRetry(
        () => Promise.all(syncPromises),
        this.config.syncRetryAttempts,
        this.config.syncTimeoutMs
      )

      const syncData: PatientAppointmentSyncData = {
        patientId,
        patientName: patient.personalInfo.fullName.value,
        patientPhone: patient.contactInfo.primaryPhone.value,
        patientEmail: patient.contactInfo.email?.value,
        patientStatus: patient.status.value,
        lastSyncedAt: new Date()
      }

      // Audit log the sync
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'SYNC_APPOINTMENTS',
        dataType: 'appointment_sync',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { appointmentCount: appointments.length, syncedAt: syncData.lastSyncedAt }
      })

      return syncData
    } catch (error) {
      await this.handleIntegrationError('syncPatientData', error, { patientId })
      throw error
    }
  }

  async unlinkPatientFromAppointment(patientId: string, appointmentId: string): Promise<void> {
    try {
      // Validate appointment exists and is linked to the patient
      const appointment = await this.appointmentRepository.findById(appointmentId)
      if (!appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`)
      }

      if (appointment.patientId !== patientId) {
        throw new Error(`Appointment ${appointmentId} is not linked to patient ${patientId}`)
      }

      // Update appointment to remove patient link
      await this.appointmentRepository.update(appointmentId, {
        patientId: '',
        patientName: '',
        updatedAt: new Date()
      })

      // Audit log the unlinking
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (patient) {
        await this.auditLogger.logDataAccess({
          userId: new UserId(patient.createdBy.value),
          patientId: patient.id,
          operation: 'UNLINK_APPOINTMENT',
          dataType: 'appointment_link',
          accessResult: 'granted',
          timestamp: new Date(),
          newValues: { appointmentId, unlinkedAt: new Date() }
        })
      }
    } catch (error) {
      await this.handleIntegrationError('unlinkPatientFromAppointment', error, { patientId, appointmentId })
      throw error
    }
  }

  async canScheduleAppointment(patientId: string): Promise<boolean> {
    try {
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        return false
      }

      return patient.canScheduleAppointment()
    } catch (error) {
      await this.handleIntegrationError('canScheduleAppointment', error, { patientId })
      return false
    }
  }

  /**
   * Executes an operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    timeoutMs: number
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
        })

        return await Promise.race([operation(), timeoutPromise])
      } catch (error) {
        lastError = error as Error
        if (attempt < maxAttempts) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
        }
      }
    }

    throw lastError || new Error('Operation failed after retries')
  }

  /**
   * Handles integration errors with logging and fallback mechanisms
   */
  private async handleIntegrationError(
    operation: string,
    error: unknown,
    context: Record<string, string>
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`Integration error in ${operation}:`, {
      error: errorMessage,
      context,
      timestamp: new Date().toISOString()
    })

    // Log to audit system if possible
    try {
      await this.auditLogger.logDataAccess({
        userId: new UserId('system'),
        patientId: new PatientId(context.patientId || 'unknown'),
        operation: 'INTEGRATION_ERROR',
        dataType: 'integration',
        accessResult: 'denied',
        timestamp: new Date(),
        newValues: {
          operation,
          error: errorMessage,
          context
        }
      })
    } catch (auditError) {
      console.error('Failed to log integration error to audit system:', auditError)
    }
  }
}
