// ============================================================================
// ERROR HANDLING MODULE EXPORTS
// ============================================================================

// Error classes
export {
  PatientManagementError,
  ValidationError,
  DataIntegrityError,
  DuplicateRecordError,
  ResourceNotFoundError,
  ResourceConflictError,
  AuthorizationError,
  SecurityViolationError,
  DataEncryptionError,
  DatabaseError,
  StorageError,
  NetworkError,
  IntegrationError,
  DataSyncError,
  LGPDComplianceError,
  ConsentError,
  DocumentValidationError,
  VirusScanError,
  BusinessRuleViolationError,
  StatusTransitionError,
  ErrorFactory
} from './PatientManagementErrors'

// Error handler
export {
  ErrorHandler,
  globalErrorHandler,
  type ErrorHandlerConfig,
  type RetryConfig,
  type ErrorContext,
  type ErrorHandlingResult,
  type IncidentReport
} from './ErrorHandler'

// Error recovery
export {
  ErrorRecoveryService,
  CircuitBreaker,
  DatabaseRecoveryStrategy,
  IntegrationRecoveryStrategy,
  StorageRecoveryStrategy,
  NetworkRecoveryStrategy,
  type RecoveryStrategy,
  type RecoveryResult,
  type CircuitBreakerConfig,
  type CircuitBreakerState
} from './ErrorRecovery'
