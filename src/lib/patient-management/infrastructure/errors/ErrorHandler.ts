// ============================================================================
// ERROR HANDLER
// Centralized error handling with retry mechanisms and recovery strategies
// ============================================================================

import {
  PatientManagementError,
  ValidationError,
  ResourceNotFoundError,
  AuthorizationError,
  SecurityViolationError,
  DatabaseError,
  StorageError,
  NetworkError,
  IntegrationError,
  DataSyncError,
  LGPDComplianceError
} from './PatientManagementErrors'

// ============================================================================
// INTERFACES
// ============================================================================

export interface ErrorHandlerConfig {
  enableRetry: boolean
  maxRetries: number
  retryDelay: number
  exponentialBackoff: boolean
  enableLogging: boolean
  enableIncidentReporting: boolean
  enableUserNotification: boolean
}

export interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  exponentialBackoff: boolean
  retryableErrors: string[]
}

export interface ErrorContext {
  userId?: string
  patientId?: string
  operation: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ErrorHandlingResult {
  success: boolean
  error?: PatientManagementError
  retryAttempts: number
  recoveryAction?: string
  userMessage: string
}

export interface IncidentReport {
  id: string
  error: PatientManagementError
  context: ErrorContext
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  resolved: boolean
  resolutionNotes?: string
}

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

export class ErrorHandler {
  private config: ErrorHandlerConfig
  private retryConfig: RetryConfig
  private incidentReports: Map<string, IncidentReport>

  constructor(
    config?: Partial<ErrorHandlerConfig>,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.config = {
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      enableLogging: true,
      enableIncidentReporting: true,
      enableUserNotification: true,
      ...config
    }

    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      exponentialBackoff: true,
      retryableErrors: [
        'DATABASE_ERROR',
        'NETWORK_ERROR',
        'STORAGE_ERROR',
        'INTEGRATION_ERROR',
        'DATA_SYNC_ERROR'
      ],
      ...retryConfig
    }

    this.incidentReports = new Map()
  }

  /**
   * Handle an error with automatic retry and recovery
   */
  async handleError(
    error: Error | PatientManagementError,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    // Convert to PatientManagementError if needed
    const managedError = this.normalizeError(error)

    // Log the error
    if (this.config.enableLogging) {
      this.logError(managedError, context)
    }

    // Check if error is retryable
    const isRetryable = this.isRetryableError(managedError)

    // Create incident report for security and critical errors
    if (this.shouldCreateIncident(managedError)) {
      await this.createIncidentReport(managedError, context)
    }

    // Determine recovery action
    const recoveryAction = this.determineRecoveryAction(managedError)

    return {
      success: false,
      error: managedError,
      retryAttempts: 0,
      recoveryAction,
      userMessage: managedError.getUserMessage()
    }
  }

  /**
   * Execute an operation with automatic retry on failure
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    let lastError: Error | undefined
    let attempt = 0

    while (attempt < this.retryConfig.maxAttempts) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        attempt++

        const managedError = this.normalizeError(error as Error)

        // Check if error is retryable
        if (!this.isRetryableError(managedError)) {
          throw managedError
        }

        // Check if we've exhausted retries
        if (attempt >= this.retryConfig.maxAttempts) {
          if (this.config.enableLogging) {
            console.error(
              `Operation failed after ${attempt} attempts`,
              { error: managedError, context }
            )
          }
          throw managedError
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateRetryDelay(attempt)

        if (this.config.enableLogging) {
          console.warn(
            `Retry attempt ${attempt}/${this.retryConfig.maxAttempts} after ${delay}ms`,
            { error: managedError, context }
          )
        }

        // Wait before retrying
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  /**
   * Execute multiple operations with fallback strategies
   */
  async executeWithFallback<T>(
    operations: Array<() => Promise<T>>,
    context: ErrorContext
  ): Promise<T> {
    const errors: Error[] = []

    for (let i = 0; i < operations.length; i++) {
      try {
        return await operations[i]()
      } catch (error) {
        errors.push(error as Error)

        if (this.config.enableLogging) {
          console.warn(
            `Fallback operation ${i + 1}/${operations.length} failed`,
            { error, context }
          )
        }

        // If this was the last operation, throw
        if (i === operations.length - 1) {
          const managedError = this.normalizeError(error as Error)
          throw managedError
        }
      }
    }

    throw new Error('All fallback operations failed')
  }

  /**
   * Handle validation errors with detailed field information
   */
  handleValidationError(
    validationErrors: Array<{ field: string; message: string; code: string }>,
    context: ErrorContext
  ): ErrorHandlingResult {
    const error = new ValidationError(
      'Validation failed',
      validationErrors,
      { context }
    )

    if (this.config.enableLogging) {
      this.logError(error, context)
    }

    return {
      success: false,
      error,
      retryAttempts: 0,
      userMessage: error.getUserMessage()
    }
  }

  /**
   * Handle security violations with incident reporting
   */
  async handleSecurityViolation(
    error: SecurityViolationError,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    // Always create incident report for security violations
    const incident = await this.createIncidentReport(error, context)

    // Log security violation
    console.error('SECURITY VIOLATION DETECTED', {
      incidentId: incident.id,
      error: error.toJSON(),
      context
    })

    // Notify security team
    await this.notifySecurityTeam(incident)

    return {
      success: false,
      error,
      retryAttempts: 0,
      recoveryAction: 'SECURITY_REVIEW_REQUIRED',
      userMessage: error.getUserMessage()
    }
  }

  /**
   * Handle LGPD compliance errors
   */
  async handleLGPDViolation(
    error: LGPDComplianceError,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    // Create incident report
    const incident = await this.createIncidentReport(error, context)

    // Log compliance violation
    console.error('LGPD COMPLIANCE VIOLATION', {
      incidentId: incident.id,
      error: error.toJSON(),
      context
    })

    // Notify compliance team
    await this.notifyComplianceTeam(incident)

    return {
      success: false,
      error,
      retryAttempts: 0,
      recoveryAction: 'COMPLIANCE_REVIEW_REQUIRED',
      userMessage: error.getUserMessage()
    }
  }

  /**
   * Create an incident report for critical errors
   */
  private async createIncidentReport(
    error: PatientManagementError,
    context: ErrorContext
  ): Promise<IncidentReport> {
    const incident: IncidentReport = {
      id: crypto.randomUUID(),
      error,
      context,
      severity: this.determineSeverity(error),
      timestamp: new Date(),
      resolved: false
    }

    this.incidentReports.set(incident.id, incident)

    if (this.config.enableIncidentReporting) {
      // In a real system, this would send to an incident management system
      console.error('INCIDENT REPORT CREATED', incident)
    }

    return incident
  }

  /**
   * Normalize any error to PatientManagementError
   */
  private normalizeError(error: Error): PatientManagementError {
    if (error instanceof PatientManagementError) {
      return error
    }

    // Check for specific error patterns and convert
    if (error.message.includes('not found')) {
      return new ResourceNotFoundError('Resource', 'unknown', {
        originalError: error
      })
    }

    if (error.message.includes('unauthorized') || error.message.includes('permission')) {
      return new AuthorizationError('unknown', 'resource', 'access', {
        originalError: error
      })
    }

    if (error.message.includes('database') || error.message.includes('query')) {
      return new DatabaseError(error.message, 'unknown', error)
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new NetworkError(error.message)
    }

    // Default to generic database error
    return new DatabaseError(
      error.message || 'An unexpected error occurred',
      'unknown',
      error
    )
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: PatientManagementError): boolean {
    return this.retryConfig.retryableErrors.includes(error.code)
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    if (!this.retryConfig.exponentialBackoff) {
      return this.retryConfig.initialDelay
    }

    const delay = this.retryConfig.initialDelay * Math.pow(2, attempt - 1)
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Determine if an incident report should be created
   */
  private shouldCreateIncident(error: PatientManagementError): boolean {
    return (
      error instanceof SecurityViolationError ||
      error instanceof LGPDComplianceError ||
      error instanceof AuthorizationError ||
      this.determineSeverity(error) === 'critical'
    )
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    error: PatientManagementError
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof SecurityViolationError) {
      return error.severity
    }

    if (error instanceof LGPDComplianceError) {
      return error.severity === 'violation' ? 'critical' : 'high'
    }

    if (error instanceof AuthorizationError) {
      return 'high'
    }

    if (error instanceof ValidationError) {
      return 'low'
    }

    if (error instanceof DatabaseError || error instanceof StorageError) {
      return 'high'
    }

    if (error instanceof IntegrationError || error instanceof DataSyncError) {
      return 'medium'
    }

    return 'medium'
  }

  /**
   * Determine recovery action for an error
   */
  private determineRecoveryAction(error: PatientManagementError): string {
    if (error instanceof ValidationError) {
      return 'CORRECT_INPUT'
    }

    if (error instanceof ResourceNotFoundError) {
      return 'VERIFY_RESOURCE_ID'
    }

    if (error instanceof AuthorizationError) {
      return 'REQUEST_PERMISSION'
    }

    if (error instanceof SecurityViolationError) {
      return 'SECURITY_REVIEW_REQUIRED'
    }

    if (error instanceof LGPDComplianceError) {
      return 'COMPLIANCE_REVIEW_REQUIRED'
    }

    if (error instanceof DatabaseError || error instanceof StorageError) {
      return 'RETRY_OPERATION'
    }

    if (error instanceof IntegrationError) {
      return 'CHECK_INTEGRATION_STATUS'
    }

    return 'CONTACT_SUPPORT'
  }

  /**
   * Log error with context
   */
  private logError(error: PatientManagementError, context: ErrorContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: error.toJSON(),
      context,
      severity: this.determineSeverity(error)
    }

    // In a real system, this would send to a logging service
    console.error('ERROR LOGGED', logEntry)
  }

  /**
   * Notify security team of security violations
   */
  private async notifySecurityTeam(incident: IncidentReport): Promise<void> {
    // In a real system, this would send notifications via email, Slack, etc.
    console.error('SECURITY TEAM NOTIFIED', {
      incidentId: incident.id,
      severity: incident.severity,
      timestamp: incident.timestamp
    })
  }

  /**
   * Notify compliance team of LGPD violations
   */
  private async notifyComplianceTeam(incident: IncidentReport): Promise<void> {
    // In a real system, this would send notifications via email, Slack, etc.
    console.error('COMPLIANCE TEAM NOTIFIED', {
      incidentId: incident.id,
      severity: incident.severity,
      timestamp: incident.timestamp
    })
  }

  /**
   * Get all incident reports
   */
  getIncidentReports(): IncidentReport[] {
    return Array.from(this.incidentReports.values())
  }

  /**
   * Get incident report by ID
   */
  getIncidentReport(id: string): IncidentReport | undefined {
    return this.incidentReports.get(id)
  }

  /**
   * Resolve an incident report
   */
  resolveIncident(id: string, resolutionNotes: string): void {
    const incident = this.incidentReports.get(id)
    if (incident) {
      incident.resolved = true
      incident.resolutionNotes = resolutionNotes
    }
  }
}

// ============================================================================
// GLOBAL ERROR HANDLER INSTANCE
// ============================================================================

export const globalErrorHandler = new ErrorHandler()
