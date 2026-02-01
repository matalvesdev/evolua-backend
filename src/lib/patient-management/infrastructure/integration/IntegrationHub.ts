// ============================================================================
// INTEGRATION HUB
// Central orchestrator for all external system integrations
// ============================================================================

import type { IAppointmentIntegration } from './IAppointmentIntegration'
import type { IReportIntegration } from './IReportIntegration'
import type { AuditLogger } from '../services/AuditLogger'
import type { Appointment } from '../../../core/domain/entities/appointment'
import { UserId } from '../../domain/value-objects/UserId'
import { PatientId } from '../../domain/value-objects/PatientId'

export interface IntegrationHubConfig {
  enableAppointmentIntegration: boolean
  enableReportIntegration: boolean
  enableAutoSync: boolean
  syncIntervalMs: number
  maxRetryAttempts: number
}

export interface IntegrationStatus {
  appointmentIntegration: {
    enabled: boolean
    healthy: boolean
    lastSyncAt?: Date
    errorCount: number
  }
  reportIntegration: {
    enabled: boolean
    healthy: boolean
    lastSyncAt?: Date
    errorCount: number
  }
}

export interface IntegrationHealthCheck {
  timestamp: Date
  overallHealth: 'healthy' | 'degraded' | 'unhealthy'
  appointmentIntegration: boolean
  reportIntegration: boolean
  errors: string[]
}

/**
 * Integration Hub - Central orchestrator for external system integrations
 * 
 * This hub manages all integrations between the patient management system
 * and external systems (appointments, reports). It provides:
 * - Unified interface for all integrations
 * - Health monitoring and status tracking
 * - Coordinated data synchronization
 * - Error handling and fallback mechanisms
 */
export class IntegrationHub {
  private errorCounts: Map<string, number> = new Map()
  private lastSyncTimes: Map<string, Date> = new Map()

  constructor(
    private readonly appointmentIntegration: IAppointmentIntegration,
    private readonly reportIntegration: IReportIntegration,
    private readonly auditLogger: AuditLogger,
    private readonly config: IntegrationHubConfig = {
      enableAppointmentIntegration: true,
      enableReportIntegration: true,
      enableAutoSync: true,
      syncIntervalMs: 300000, // 5 minutes
      maxRetryAttempts: 3
    }
  ) {
    this.initializeErrorCounts()
  }

  /**
   * Links a patient to an appointment with comprehensive error handling
   */
  async linkPatientToAppointment(patientId: string, appointmentId: string): Promise<void> {
    if (!this.config.enableAppointmentIntegration) {
      throw new Error('Appointment integration is disabled')
    }

    try {
      await this.appointmentIntegration.linkPatientToAppointment(patientId, appointmentId)
      this.recordSuccess('appointment')
      this.lastSyncTimes.set('appointment', new Date())

      // Propagate changes to report system if enabled
      if (this.config.enableReportIntegration && this.config.enableAutoSync) {
        await this.reportIntegration.propagatePatientDataChanges(patientId, ['appointments'])
          .catch(error => this.handleFallback('report', error))
      }
    } catch (error) {
      this.recordError('appointment')
      throw error
    }
  }

  /**
   * Synchronizes patient data across all integrated systems
   */
  async syncPatientData(patientId: string): Promise<void> {
    const errors: string[] = []

    // Sync with appointment system
    if (this.config.enableAppointmentIntegration) {
      try {
        await this.appointmentIntegration.syncPatientData(patientId)
        this.recordSuccess('appointment')
        this.lastSyncTimes.set('appointment', new Date())
      } catch (error) {
        this.recordError('appointment')
        errors.push(`Appointment sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Sync with report system
    if (this.config.enableReportIntegration) {
      try {
        await this.reportIntegration.propagatePatientDataChanges(patientId, ['all'])
        this.recordSuccess('report')
        this.lastSyncTimes.set('report', new Date())
      } catch (error) {
        this.recordError('report')
        errors.push(`Report sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Audit log the sync operation
    await this.auditLogger.logDataAccess({
      userId: new UserId('system'),
      patientId: new PatientId(patientId),
      operation: 'SYNC_PATIENT_DATA',
      dataType: 'integration_sync',
      accessResult: errors.length > 0 ? 'partial' : 'granted',
      timestamp: new Date(),
      newValues: {
        timestamp: new Date(),
        errors: errors.length > 0 ? errors : undefined
      }
    })

    if (errors.length > 0) {
      throw new Error(`Sync completed with errors: ${errors.join('; ')}`)
    }
  }

  /**
   * Generates a comprehensive patient report with data from all systems
   */
  async generateComprehensiveReport(patientId: string): Promise<{
    summary: unknown
    appointments: Appointment[]
    generatedAt: Date
  }> {
    if (!this.config.enableReportIntegration) {
      throw new Error('Report integration is disabled')
    }

    try {
      // Get patient summary
      const summary = await this.reportIntegration.generatePatientSummary(patientId)

      // Get appointments if integration is enabled
      let appointments: Appointment[] = []
      if (this.config.enableAppointmentIntegration) {
        try {
          appointments = await this.appointmentIntegration.getPatientAppointments(patientId)
        } catch (error) {
          console.warn('Failed to retrieve appointments for report:', error)
        }
      }

      return {
        summary,
        appointments,
        generatedAt: new Date()
      }
    } catch (error) {
      this.recordError('report')
      throw error
    }
  }

  /**
   * Validates data consistency across all integrated systems
   */
  async validateDataConsistency(patientId: string): Promise<boolean> {
    const validationResults: boolean[] = []

    // Validate report system consistency
    if (this.config.enableReportIntegration) {
      try {
        const isConsistent = await this.reportIntegration.validateDataConsistency(patientId)
        validationResults.push(isConsistent)
      } catch (error) {
        console.error('Report consistency validation failed:', error)
        validationResults.push(false)
      }
    }

    // Validate appointment system consistency
    if (this.config.enableAppointmentIntegration) {
      try {
        const canSchedule = await this.appointmentIntegration.canScheduleAppointment(patientId)
        // If patient exists and has valid status, this should return a boolean
        validationResults.push(typeof canSchedule === 'boolean')
      } catch (error) {
        console.error('Appointment consistency validation failed:', error)
        validationResults.push(false)
      }
    }

    // All validations must pass
    return validationResults.every(result => result === true)
  }

  /**
   * Performs health check on all integrations
   */
  async performHealthCheck(): Promise<IntegrationHealthCheck> {
    const errors: string[] = []
    let appointmentHealthy = false
    let reportHealthy = false

    // Check appointment integration
    if (this.config.enableAppointmentIntegration) {
      const errorCount = this.errorCounts.get('appointment') || 0
      appointmentHealthy = errorCount < this.config.maxRetryAttempts
      if (!appointmentHealthy) {
        errors.push(`Appointment integration unhealthy: ${errorCount} errors`)
      }
    } else {
      appointmentHealthy = true // Disabled integrations are considered healthy
    }

    // Check report integration
    if (this.config.enableReportIntegration) {
      const errorCount = this.errorCounts.get('report') || 0
      reportHealthy = errorCount < this.config.maxRetryAttempts
      if (!reportHealthy) {
        errors.push(`Report integration unhealthy: ${errorCount} errors`)
      }
    } else {
      reportHealthy = true // Disabled integrations are considered healthy
    }

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy'
    if (appointmentHealthy && reportHealthy) {
      overallHealth = 'healthy'
    } else if (appointmentHealthy || reportHealthy) {
      overallHealth = 'degraded'
    } else {
      overallHealth = 'unhealthy'
    }

    return {
      timestamp: new Date(),
      overallHealth,
      appointmentIntegration: appointmentHealthy,
      reportIntegration: reportHealthy,
      errors
    }
  }

  /**
   * Gets current integration status
   */
  getIntegrationStatus(): IntegrationStatus {
    return {
      appointmentIntegration: {
        enabled: this.config.enableAppointmentIntegration,
        healthy: (this.errorCounts.get('appointment') || 0) < this.config.maxRetryAttempts,
        lastSyncAt: this.lastSyncTimes.get('appointment'),
        errorCount: this.errorCounts.get('appointment') || 0
      },
      reportIntegration: {
        enabled: this.config.enableReportIntegration,
        healthy: (this.errorCounts.get('report') || 0) < this.config.maxRetryAttempts,
        lastSyncAt: this.lastSyncTimes.get('report'),
        errorCount: this.errorCounts.get('report') || 0
      }
    }
  }

  /**
   * Resets error counts for a specific integration or all integrations
   */
  resetErrorCounts(integration?: 'appointment' | 'report'): void {
    if (integration) {
      this.errorCounts.set(integration, 0)
    } else {
      this.initializeErrorCounts()
    }
  }

  /**
   * Handles fallback mechanisms when integration fails
   */
  private async handleFallback(integration: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.warn(`Integration fallback triggered for ${integration}:`, errorMessage)

    // Log to audit system
    try {
      await this.auditLogger.logDataAccess({
        userId: new UserId('system'),
        patientId: new PatientId('integration-hub'),
        operation: 'INTEGRATION_FALLBACK',
        dataType: 'integration',
        accessResult: 'denied',
        timestamp: new Date(),
        newValues: {
          integration,
          error: errorMessage,
          timestamp: new Date()
        }
      })
    } catch (auditError) {
      console.error('Failed to log fallback to audit system:', auditError)
    }
  }

  /**
   * Records a successful integration operation
   */
  private recordSuccess(integration: string): void {
    this.errorCounts.set(integration, 0)
  }

  /**
   * Records an integration error
   */
  private recordError(integration: string): void {
    const currentCount = this.errorCounts.get(integration) || 0
    this.errorCounts.set(integration, currentCount + 1)
  }

  /**
   * Initializes error counts for all integrations
   */
  private initializeErrorCounts(): void {
    this.errorCounts.set('appointment', 0)
    this.errorCounts.set('report', 0)
  }
}
