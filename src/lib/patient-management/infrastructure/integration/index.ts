// ============================================================================
// INTEGRATION MODULE EXPORTS
// Central export point for all integration interfaces and services
// ============================================================================

// Appointment Integration
export { 
  type IAppointmentIntegration,
  type AppointmentLinkData,
  type PatientAppointmentSyncData
} from './IAppointmentIntegration'

export { 
  AppointmentIntegrationService,
  type AppointmentIntegrationConfig
} from './AppointmentIntegrationService'

// Report Integration
export {
  type IReportIntegration,
  type ReportData,
  type PatientSummary,
  type ExportResult,
  ReportType,
  ExportFormat
} from './IReportIntegration'

export {
  ReportIntegrationService,
  type ReportIntegrationConfig
} from './ReportIntegrationService'

// Integration Hub
export {
  IntegrationHub,
  type IntegrationHubConfig,
  type IntegrationStatus,
  type IntegrationHealthCheck
} from './IntegrationHub'
