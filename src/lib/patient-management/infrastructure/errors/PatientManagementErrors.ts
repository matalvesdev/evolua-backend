// ============================================================================
// PATIENT MANAGEMENT ERROR CLASSES
// Custom error types for comprehensive error handling
// ============================================================================

/**
 * Base error class for all patient management errors
 */
export abstract class PatientManagementError extends Error {
  public readonly code: string
  public readonly timestamp: Date
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    code: string,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.timestamp = new Date()
    this.context = context
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    }
  }

  /**
   * Get user-friendly error message
   */
  abstract getUserMessage(): string
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export class ValidationError extends PatientManagementError {
  public readonly field?: string
  public readonly validationErrors: Array<{
    field: string
    message: string
    code: string
  }>

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string; code: string }>,
    context?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', context)
    this.validationErrors = validationErrors
    this.field = validationErrors[0]?.field
  }

  getUserMessage(): string {
    if (this.validationErrors.length === 1) {
      return this.validationErrors[0].message
    }
    return `Validation failed: ${this.validationErrors.length} errors found`
  }
}

export class DataIntegrityError extends PatientManagementError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATA_INTEGRITY_ERROR', context)
  }

  getUserMessage(): string {
    return 'Data integrity check failed. Please verify your input and try again.'
  }
}

export class DuplicateRecordError extends PatientManagementError {
  public readonly duplicates: Array<{ id: string; name: string }>

  constructor(
    message: string,
    duplicates: Array<{ id: string; name: string }>,
    context?: Record<string, any>
  ) {
    super(message, 'DUPLICATE_RECORD', context)
    this.duplicates = duplicates
  }

  getUserMessage(): string {
    return 'A similar record already exists in the system. Please review potential duplicates.'
  }
}

// ============================================================================
// RESOURCE ERRORS
// ============================================================================

export class ResourceNotFoundError extends PatientManagementError {
  public readonly resourceType: string
  public readonly resourceId: string

  constructor(
    resourceType: string,
    resourceId: string,
    context?: Record<string, any>
  ) {
    super(
      `${resourceType} with ID ${resourceId} not found`,
      'RESOURCE_NOT_FOUND',
      context
    )
    this.resourceType = resourceType
    this.resourceId = resourceId
  }

  getUserMessage(): string {
    return `The requested ${this.resourceType.toLowerCase()} could not be found.`
  }
}

export class ResourceConflictError extends PatientManagementError {
  public readonly conflictingResource: string

  constructor(
    message: string,
    conflictingResource: string,
    context?: Record<string, any>
  ) {
    super(message, 'RESOURCE_CONFLICT', context)
    this.conflictingResource = conflictingResource
  }

  getUserMessage(): string {
    return 'The operation conflicts with existing data. Please review and try again.'
  }
}

// ============================================================================
// SECURITY ERRORS
// ============================================================================

export class AuthorizationError extends PatientManagementError {
  public readonly userId: string
  public readonly resource: string
  public readonly action: string

  constructor(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ) {
    super(
      `User ${userId} is not authorized to ${action} ${resource}`,
      'AUTHORIZATION_ERROR',
      context
    )
    this.userId = userId
    this.resource = resource
    this.action = action
  }

  getUserMessage(): string {
    return 'You do not have permission to perform this action.'
  }
}

export class SecurityViolationError extends PatientManagementError {
  public readonly violationType: string
  public readonly severity: 'low' | 'medium' | 'high' | 'critical'

  constructor(
    message: string,
    violationType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>
  ) {
    super(message, 'SECURITY_VIOLATION', context)
    this.violationType = violationType
    this.severity = severity
  }

  getUserMessage(): string {
    return 'A security violation was detected. This incident has been logged.'
  }
}

export class DataEncryptionError extends PatientManagementError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATA_ENCRYPTION_ERROR', context)
  }

  getUserMessage(): string {
    return 'Failed to encrypt sensitive data. Please contact support.'
  }
}

// ============================================================================
// SYSTEM ERRORS
// ============================================================================

export class DatabaseError extends PatientManagementError {
  public readonly operation: string
  public readonly originalError?: Error

  constructor(
    message: string,
    operation: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message, 'DATABASE_ERROR', context)
    this.operation = operation
    this.originalError = originalError
  }

  getUserMessage(): string {
    return 'A database error occurred. Please try again later.'
  }
}

export class StorageError extends PatientManagementError {
  public readonly storageType: 'file' | 'database' | 'cache'
  public readonly originalError?: Error

  constructor(
    message: string,
    storageType: 'file' | 'database' | 'cache',
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message, 'STORAGE_ERROR', context)
    this.storageType = storageType
    this.originalError = originalError
  }

  getUserMessage(): string {
    return 'A storage error occurred. Please try again later.'
  }
}

export class NetworkError extends PatientManagementError {
  public readonly endpoint?: string
  public readonly statusCode?: number

  constructor(
    message: string,
    endpoint?: string,
    statusCode?: number,
    context?: Record<string, any>
  ) {
    super(message, 'NETWORK_ERROR', context)
    this.endpoint = endpoint
    this.statusCode = statusCode
  }

  getUserMessage(): string {
    return 'A network error occurred. Please check your connection and try again.'
  }
}

// ============================================================================
// INTEGRATION ERRORS
// ============================================================================

export class IntegrationError extends PatientManagementError {
  public readonly system: string
  public readonly operation: string
  public readonly originalError?: Error

  constructor(
    message: string,
    system: string,
    operation: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message, 'INTEGRATION_ERROR', context)
    this.system = system
    this.operation = operation
    this.originalError = originalError
  }

  getUserMessage(): string {
    return `Integration with ${this.system} failed. The operation will be retried automatically.`
  }
}

export class DataSyncError extends PatientManagementError {
  public readonly sourceSystem: string
  public readonly targetSystem: string

  constructor(
    message: string,
    sourceSystem: string,
    targetSystem: string,
    context?: Record<string, any>
  ) {
    super(message, 'DATA_SYNC_ERROR', context)
    this.sourceSystem = sourceSystem
    this.targetSystem = targetSystem
  }

  getUserMessage(): string {
    return 'Data synchronization failed. Changes may not be reflected across all systems.'
  }
}

// ============================================================================
// LGPD COMPLIANCE ERRORS
// ============================================================================

export class LGPDComplianceError extends PatientManagementError {
  public readonly complianceType: string
  public readonly severity: 'warning' | 'violation'

  constructor(
    message: string,
    complianceType: string,
    severity: 'warning' | 'violation',
    context?: Record<string, any>
  ) {
    super(message, 'LGPD_COMPLIANCE_ERROR', context)
    this.complianceType = complianceType
    this.severity = severity
  }

  getUserMessage(): string {
    return 'This operation violates LGPD compliance requirements.'
  }
}

export class ConsentError extends PatientManagementError {
  public readonly consentType: string
  public readonly patientId: string

  constructor(
    message: string,
    consentType: string,
    patientId: string,
    context?: Record<string, any>
  ) {
    super(message, 'CONSENT_ERROR', context)
    this.consentType = consentType
    this.patientId = patientId
  }

  getUserMessage(): string {
    return 'Patient consent is required for this operation.'
  }
}

// ============================================================================
// DOCUMENT ERRORS
// ============================================================================

export class DocumentValidationError extends PatientManagementError {
  public readonly fileName: string
  public readonly validationErrors: string[]

  constructor(
    message: string,
    fileName: string,
    validationErrors: string[],
    context?: Record<string, any>
  ) {
    super(message, 'DOCUMENT_VALIDATION_ERROR', context)
    this.fileName = fileName
    this.validationErrors = validationErrors
  }

  getUserMessage(): string {
    return `Document validation failed: ${this.validationErrors.join(', ')}`
  }
}

export class VirusScanError extends PatientManagementError {
  public readonly fileName: string
  public readonly threatDetected?: string

  constructor(
    message: string,
    fileName: string,
    threatDetected?: string,
    context?: Record<string, any>
  ) {
    super(message, 'VIRUS_SCAN_ERROR', context)
    this.fileName = fileName
    this.threatDetected = threatDetected
  }

  getUserMessage(): string {
    if (this.threatDetected) {
      return `Security threat detected in file: ${this.fileName}`
    }
    return `Virus scan failed for file: ${this.fileName}`
  }
}

// ============================================================================
// BUSINESS LOGIC ERRORS
// ============================================================================

export class BusinessRuleViolationError extends PatientManagementError {
  public readonly rule: string

  constructor(
    message: string,
    rule: string,
    context?: Record<string, any>
  ) {
    super(message, 'BUSINESS_RULE_VIOLATION', context)
    this.rule = rule
  }

  getUserMessage(): string {
    return this.message
  }
}

export class StatusTransitionError extends PatientManagementError {
  public readonly currentStatus: string
  public readonly targetStatus: string

  constructor(
    currentStatus: string,
    targetStatus: string,
    context?: Record<string, any>
  ) {
    super(
      `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      'STATUS_TRANSITION_ERROR',
      context
    )
    this.currentStatus = currentStatus
    this.targetStatus = targetStatus
  }

  getUserMessage(): string {
    return `Cannot change status from ${this.currentStatus} to ${this.targetStatus}`
  }
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

export class ErrorFactory {
  static createValidationError(
    validationErrors: Array<{ field: string; message: string; code: string }>,
    context?: Record<string, any>
  ): ValidationError {
    return new ValidationError(
      'Validation failed',
      validationErrors,
      context
    )
  }

  static createNotFoundError(
    resourceType: string,
    resourceId: string,
    context?: Record<string, any>
  ): ResourceNotFoundError {
    return new ResourceNotFoundError(resourceType, resourceId, context)
  }

  static createAuthorizationError(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): AuthorizationError {
    return new AuthorizationError(userId, resource, action, context)
  }

  static createDatabaseError(
    message: string,
    operation: string,
    originalError?: Error,
    context?: Record<string, any>
  ): DatabaseError {
    return new DatabaseError(message, operation, originalError, context)
  }

  static createIntegrationError(
    message: string,
    system: string,
    operation: string,
    originalError?: Error,
    context?: Record<string, any>
  ): IntegrationError {
    return new IntegrationError(message, system, operation, originalError, context)
  }
}
