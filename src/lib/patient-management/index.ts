// ============================================================================
// PATIENT MANAGEMENT MODULE INDEX
// Main entry point for the patient management system
// ============================================================================

// Domain exports
export * from './domain'

// Application exports
export * from './application'

// Infrastructure exports
export * from './infrastructure'

// Testing utilities (for development and testing)
export * from './testing/generators'

// Client and Server initialization
export * from './client'
export * from './server'

// Facade for simplified API
export { PatientManagementFacade } from './PatientManagementFacade'

// React hooks
export * from './hooks'

// Container for dependency injection
export { PatientManagementContainer } from './infrastructure/factories/PatientManagementContainer'