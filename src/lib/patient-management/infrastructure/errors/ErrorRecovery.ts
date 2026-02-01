// ============================================================================
// ERROR RECOVERY SERVICE
// Implements recovery strategies for different error scenarios
// ============================================================================

import {
  PatientManagementError,
  DatabaseError,
  IntegrationError,
  DataSyncError,
  StorageError,
  NetworkError
} from './PatientManagementErrors'
import { ErrorHandler, ErrorContext } from './ErrorHandler'

// ============================================================================
// INTERFACES
// ============================================================================

export interface RecoveryStrategy {
  name: string
  canHandle: (error: PatientManagementError) => boolean
  recover: (error: PatientManagementError, context: ErrorContext) => Promise<RecoveryResult>
}

export interface RecoveryResult {
  success: boolean
  message: string
  data?: any
  requiresManualIntervention: boolean
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

export interface CircuitBreakerState {
  failures: number
  lastFailureTime?: Date
  state: 'closed' | 'open' | 'half-open'
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export class CircuitBreaker {
  private state: CircuitBreakerState
  private config: CircuitBreakerConfig

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      ...config
    }

    this.state = {
      failures: 0,
      state: 'closed'
    }
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check circuit state
    if (this.state.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'half-open'
      } else {
        if (fallback) {
          return await fallback()
        }
        throw new Error('Circuit breaker is open - service unavailable')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()

      if (fallback && this.state.state === 'open') {
        return await fallback()
      }

      throw error
    }
  }

  /**
   * Record successful operation
   */
  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.reset()
    }
  }

  /**
   * Record failed operation
   */
  private onFailure(): void {
    this.state.failures++
    this.state.lastFailureTime = new Date()

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = 'open'
    }
  }

  /**
   * Check if circuit breaker should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.state.lastFailureTime) {
      return false
    }

    const timeSinceLastFailure = Date.now() - this.state.lastFailureTime.getTime()
    return timeSinceLastFailure >= this.config.resetTimeout
  }

  /**
   * Reset circuit breaker
   */
  private reset(): void {
    this.state = {
      failures: 0,
      state: 'closed'
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerState {
    return { ...this.state }
  }
}

// ============================================================================
// RECOVERY STRATEGIES
// ============================================================================

/**
 * Database error recovery strategy
 */
export class DatabaseRecoveryStrategy implements RecoveryStrategy {
  name = 'DatabaseRecovery'

  canHandle(error: PatientManagementError): boolean {
    return error instanceof DatabaseError
  }

  async recover(
    error: PatientManagementError,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    const dbError = error as DatabaseError

    // Check if it's a connection error
    if (this.isConnectionError(dbError)) {
      return {
        success: false,
        message: 'Database connection lost. Retrying...',
        requiresManualIntervention: false
      }
    }

    // Check if it's a constraint violation
    if (this.isConstraintViolation(dbError)) {
      return {
        success: false,
        message: 'Data constraint violation. Please check your input.',
        requiresManualIntervention: true
      }
    }

    // Check if it's a deadlock
    if (this.isDeadlock(dbError)) {
      return {
        success: false,
        message: 'Database deadlock detected. Operation will be retried.',
        requiresManualIntervention: false
      }
    }

    return {
      success: false,
      message: 'Database error occurred. Please try again later.',
      requiresManualIntervention: true
    }
  }

  private isConnectionError(error: DatabaseError): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    )
  }

  private isConstraintViolation(error: DatabaseError): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('constraint') ||
      message.includes('unique') ||
      message.includes('foreign key')
    )
  }

  private isDeadlock(error: DatabaseError): boolean {
    const message = error.message.toLowerCase()
    return message.includes('deadlock')
  }
}

/**
 * Integration error recovery strategy
 */
export class IntegrationRecoveryStrategy implements RecoveryStrategy {
  name = 'IntegrationRecovery'
  private circuitBreakers: Map<string, CircuitBreaker>

  constructor() {
    this.circuitBreakers = new Map()
  }

  canHandle(error: PatientManagementError): boolean {
    return error instanceof IntegrationError || error instanceof DataSyncError
  }

  async recover(
    error: PatientManagementError,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    if (error instanceof IntegrationError) {
      const circuitBreaker = this.getCircuitBreaker(error.system)
      const state = circuitBreaker.getState()

      if (state.state === 'open') {
        return {
          success: false,
          message: `Integration with ${error.system} is temporarily unavailable. Using fallback.`,
          requiresManualIntervention: false
        }
      }

      return {
        success: false,
        message: `Integration with ${error.system} failed. Retrying...`,
        requiresManualIntervention: false
      }
    }

    if (error instanceof DataSyncError) {
      return {
        success: false,
        message: 'Data synchronization failed. Changes will be synced automatically.',
        requiresManualIntervention: false
      }
    }

    return {
      success: false,
      message: 'Integration error occurred.',
      requiresManualIntervention: true
    }
  }

  private getCircuitBreaker(system: string): CircuitBreaker {
    if (!this.circuitBreakers.has(system)) {
      this.circuitBreakers.set(system, new CircuitBreaker())
    }
    return this.circuitBreakers.get(system)!
  }

  /**
   * Execute integration operation with circuit breaker
   */
  async executeWithCircuitBreaker<T>(
    system: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(system)
    return await circuitBreaker.execute(operation, fallback)
  }
}

/**
 * Storage error recovery strategy
 */
export class StorageRecoveryStrategy implements RecoveryStrategy {
  name = 'StorageRecovery'

  canHandle(error: PatientManagementError): boolean {
    return error instanceof StorageError
  }

  async recover(
    error: PatientManagementError,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    const storageError = error as StorageError

    if (storageError.storageType === 'file') {
      return {
        success: false,
        message: 'File storage error. Please try uploading again.',
        requiresManualIntervention: true
      }
    }

    if (storageError.storageType === 'cache') {
      return {
        success: true,
        message: 'Cache error. Falling back to database.',
        requiresManualIntervention: false
      }
    }

    return {
      success: false,
      message: 'Storage error occurred. Please try again.',
      requiresManualIntervention: true
    }
  }
}

/**
 * Network error recovery strategy
 */
export class NetworkRecoveryStrategy implements RecoveryStrategy {
  name = 'NetworkRecovery'

  canHandle(error: PatientManagementError): boolean {
    return error instanceof NetworkError
  }

  async recover(
    error: PatientManagementError,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    const networkError = error as NetworkError

    // Check if it's a timeout
    if (this.isTimeout(networkError)) {
      return {
        success: false,
        message: 'Request timed out. Retrying with longer timeout...',
        requiresManualIntervention: false
      }
    }

    // Check if it's a connection error
    if (this.isConnectionError(networkError)) {
      return {
        success: false,
        message: 'Network connection lost. Please check your internet connection.',
        requiresManualIntervention: true
      }
    }

    // Check status code for specific errors
    if (networkError.statusCode) {
      if (networkError.statusCode >= 500) {
        return {
          success: false,
          message: 'Server error. Retrying...',
          requiresManualIntervention: false
        }
      }

      if (networkError.statusCode === 429) {
        return {
          success: false,
          message: 'Rate limit exceeded. Please wait before retrying.',
          requiresManualIntervention: true
        }
      }
    }

    return {
      success: false,
      message: 'Network error occurred. Please try again.',
      requiresManualIntervention: true
    }
  }

  private isTimeout(error: NetworkError): boolean {
    return error.message.toLowerCase().includes('timeout')
  }

  private isConnectionError(error: NetworkError): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('offline')
    )
  }
}

// ============================================================================
// ERROR RECOVERY SERVICE
// ============================================================================

export class ErrorRecoveryService {
  private strategies: RecoveryStrategy[]
  private errorHandler: ErrorHandler

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler
    this.strategies = [
      new DatabaseRecoveryStrategy(),
      new IntegrationRecoveryStrategy(),
      new StorageRecoveryStrategy(),
      new NetworkRecoveryStrategy()
    ]
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(
    error: PatientManagementError,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    // Find appropriate recovery strategy
    const strategy = this.strategies.find(s => s.canHandle(error))

    if (!strategy) {
      return {
        success: false,
        message: 'No recovery strategy available for this error.',
        requiresManualIntervention: true
      }
    }

    try {
      const result = await strategy.recover(error, context)

      // Log recovery attempt
      console.info('Recovery attempt', {
        strategy: strategy.name,
        error: error.code,
        result,
        context
      })

      return result
    } catch (recoveryError) {
      console.error('Recovery failed', {
        strategy: strategy.name,
        error: error.code,
        recoveryError,
        context
      })

      return {
        success: false,
        message: 'Recovery attempt failed.',
        requiresManualIntervention: true
      }
    }
  }

  /**
   * Execute operation with automatic recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRecoveryAttempts: number = 3
  ): Promise<T> {
    let attempts = 0

    while (attempts < maxRecoveryAttempts) {
      try {
        return await operation()
      } catch (error) {
        attempts++

        const managedError = error instanceof PatientManagementError
          ? error
          : new DatabaseError('Operation failed', context.operation, error as Error)

        // Attempt recovery
        const recoveryResult = await this.attemptRecovery(managedError, context)

        // If recovery requires manual intervention or we've exhausted attempts, throw
        if (recoveryResult.requiresManualIntervention || attempts >= maxRecoveryAttempts) {
          throw managedError
        }

        // Wait before retrying
        await this.sleep(1000 * attempts)
      }
    }

    throw new Error('Operation failed after maximum recovery attempts')
  }

  /**
   * Add custom recovery strategy
   */
  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy)
  }

  /**
   * Get integration recovery strategy for circuit breaker operations
   */
  getIntegrationStrategy(): IntegrationRecoveryStrategy {
    const strategy = this.strategies.find(
      s => s instanceof IntegrationRecoveryStrategy
    ) as IntegrationRecoveryStrategy

    if (!strategy) {
      throw new Error('Integration recovery strategy not found')
    }

    return strategy
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
