// ============================================================================
// INTEGRATION HUB USAGE EXAMPLE
// Demonstrates how to use the Integration Hub for external system integrations
// ============================================================================

import { IntegrationHub } from '../infrastructure/integration/IntegrationHub'
import { AppointmentIntegrationService } from '../infrastructure/integration/AppointmentIntegrationService'
import { ReportIntegrationService } from '../infrastructure/integration/ReportIntegrationService'
import { AuditLogger } from '../infrastructure/services/AuditLogger'
import { ExportFormat } from '../infrastructure/integration/IReportIntegration'

/**
 * Example: Setting up the Integration Hub
 */
export async function setupIntegrationHub(
  appointmentRepository: any,
  patientRepository: any,
  medicalRecordRepository: any,
  reportRepository: any,
  auditRepository: any,
  encryptionService: any
): Promise<IntegrationHub> {
  // Create audit logger
  const auditLogger = new AuditLogger(auditRepository, encryptionService)

  // Create appointment integration service
  const appointmentIntegration = new AppointmentIntegrationService(
    appointmentRepository,
    patientRepository,
    auditLogger,
    {
      enableRealTimeSync: true,
      syncRetryAttempts: 3,
      syncTimeoutMs: 5000
    }
  )

  // Create report integration service
  const reportIntegration = new ReportIntegrationService(
    patientRepository,
    medicalRecordRepository,
    reportRepository,
    appointmentRepository,
    auditLogger,
    {
      enableChangeTracking: true,
      autoSyncOnUpdate: true,
      consistencyCheckIntervalMs: 60000
    }
  )

  // Create integration hub
  const integrationHub = new IntegrationHub(
    appointmentIntegration,
    reportIntegration,
    auditLogger,
    {
      enableAppointmentIntegration: true,
      enableReportIntegration: true,
      enableAutoSync: true,
      syncIntervalMs: 300000,
      maxRetryAttempts: 3
    }
  )

  return integrationHub
}

/**
 * Example: Linking a patient to an appointment
 */
export async function linkPatientToAppointmentExample(
  integrationHub: IntegrationHub,
  patientId: string,
  appointmentId: string
): Promise<void> {
  try {
    // Link patient to appointment
    // This will automatically sync data across systems if auto-sync is enabled
    await integrationHub.linkPatientToAppointment(patientId, appointmentId)
    
    console.log(`Successfully linked patient ${patientId} to appointment ${appointmentId}`)
  } catch (error) {
    console.error('Failed to link patient to appointment:', error)
    throw error
  }
}

/**
 * Example: Synchronizing patient data across all systems
 */
export async function syncPatientDataExample(
  integrationHub: IntegrationHub,
  patientId: string
): Promise<void> {
  try {
    // Sync patient data with all integrated systems
    await integrationHub.syncPatientData(patientId)
    
    console.log(`Successfully synced patient ${patientId} data across all systems`)
  } catch (error) {
    console.error('Failed to sync patient data:', error)
    // Error contains details about which systems failed
    throw error
  }
}

/**
 * Example: Generating a comprehensive patient report
 */
export async function generateComprehensiveReportExample(
  integrationHub: IntegrationHub,
  patientId: string
): Promise<void> {
  try {
    // Generate report with data from all systems
    const report = await integrationHub.generateComprehensiveReport(patientId)
    
    console.log('Patient Summary:', report.summary)
    console.log('Appointments:', report.appointments.length)
    console.log('Generated At:', report.generatedAt)
  } catch (error) {
    console.error('Failed to generate comprehensive report:', error)
    throw error
  }
}

/**
 * Example: Validating data consistency across systems
 */
export async function validateDataConsistencyExample(
  integrationHub: IntegrationHub,
  patientId: string
): Promise<void> {
  try {
    // Validate that patient data is consistent across all systems
    const isConsistent = await integrationHub.validateDataConsistency(patientId)
    
    if (isConsistent) {
      console.log(`Patient ${patientId} data is consistent across all systems`)
    } else {
      console.warn(`Patient ${patientId} data has inconsistencies - sync recommended`)
      
      // Optionally trigger a sync to fix inconsistencies
      await integrationHub.syncPatientData(patientId)
    }
  } catch (error) {
    console.error('Failed to validate data consistency:', error)
    throw error
  }
}

/**
 * Example: Performing health check on integrations
 */
export async function performHealthCheckExample(
  integrationHub: IntegrationHub
): Promise<void> {
  try {
    // Check health of all integrations
    const healthCheck = await integrationHub.performHealthCheck()
    
    console.log('Overall Health:', healthCheck.overallHealth)
    console.log('Appointment Integration:', healthCheck.appointmentIntegration ? 'Healthy' : 'Unhealthy')
    console.log('Report Integration:', healthCheck.reportIntegration ? 'Healthy' : 'Unhealthy')
    
    if (healthCheck.errors.length > 0) {
      console.warn('Integration Errors:', healthCheck.errors)
    }
    
    // Get detailed status
    const status = integrationHub.getIntegrationStatus()
    console.log('Appointment Integration Status:', status.appointmentIntegration)
    console.log('Report Integration Status:', status.reportIntegration)
  } catch (error) {
    console.error('Failed to perform health check:', error)
    throw error
  }
}

/**
 * Example: Exporting patient data
 */
export async function exportPatientDataExample(
  reportIntegration: ReportIntegrationService,
  patientId: string
): Promise<void> {
  try {
    // Export patient data in JSON format
    const jsonExport = await reportIntegration.exportPatientData(patientId, ExportFormat.JSON)
    console.log('JSON Export:', jsonExport.fileSize, 'bytes')
    
    // Export patient data in CSV format
    const csvExport = await reportIntegration.exportPatientData(patientId, ExportFormat.CSV)
    console.log('CSV Export:', csvExport.fileSize, 'bytes')
    
    // Export patient data in XML format
    const xmlExport = await reportIntegration.exportPatientData(patientId, ExportFormat.XML)
    console.log('XML Export:', xmlExport.fileSize, 'bytes')
  } catch (error) {
    console.error('Failed to export patient data:', error)
    throw error
  }
}

/**
 * Example: Error handling and recovery
 */
export async function errorHandlingExample(
  integrationHub: IntegrationHub,
  patientId: string
): Promise<void> {
  try {
    // Attempt to sync patient data
    await integrationHub.syncPatientData(patientId)
  } catch (error) {
    console.error('Sync failed:', error)
    
    // Check integration status to diagnose the issue
    const status = integrationHub.getIntegrationStatus()
    
    if (!status.appointmentIntegration.healthy) {
      console.error('Appointment integration is unhealthy')
      console.error('Error count:', status.appointmentIntegration.errorCount)
      
      // Reset error counts if needed
      integrationHub.resetErrorCounts('appointment')
    }
    
    if (!status.reportIntegration.healthy) {
      console.error('Report integration is unhealthy')
      console.error('Error count:', status.reportIntegration.errorCount)
      
      // Reset error counts if needed
      integrationHub.resetErrorCounts('report')
    }
    
    // Retry after resetting error counts
    try {
      await integrationHub.syncPatientData(patientId)
      console.log('Retry successful after error recovery')
    } catch (retryError) {
      console.error('Retry also failed:', retryError)
      throw retryError
    }
  }
}
