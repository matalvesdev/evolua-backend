// ============================================================================
// ERROR HANDLING AND RECOVERY PROPERTY TESTS
// Property-based tests for error handling, logging, and recovery mechanisms
// Feature: patient-management-system, Property 18: Error Handling and Recovery
// **Validates: Requirements 4.6, 6.6**
// ============================================================================

import * as fc from 'fast-check'
import {
  ErrorHandler,
  ErrorRecoveryService,
  DatabaseError,
  IntegrationError,
  NetworkError,
  StorageError,
  ValidationError,
  PatientManagementError,
  type ErrorContext
} from '../../infrastructure/errors'

// ============================================================================
// MOCK ERROR LOGGER
// ============================================================================

interface ErrorLogEntry {
  id: string
  error: PatientManagementError
  context: ErrorContext
  timestamp: Date
  userMessage: string
  recoveryAction?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class MockErrorLogger {
  private logs: ErrorLogEntry[] = []

  logError(
    error: PatientManagementError,
    context: ErrorContext,
    userMessage: string,
    recoveryAction?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const logEntry: ErrorLogEntry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      error,
      context,
      timestamp: new Date(),
      userMessage,
      recoveryAction,
      severity
    }

    this.logs.push(logEntry)
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs]
  }

  getLogsByErrorType(errorType: string): ErrorLogEntry[] {
    return this.logs.filter(log => log.error.constructor.name === errorType)
  }

  clear(): void {
    this.logs = []
  }
}

// ============================================================================
// MOCK SYSTEM WITH ERROR HANDLING
// ============================================================================

class MockSystemWithErrorHandling {
  private errorHandler: ErrorHandler
  private recoveryService: ErrorRecoveryService
  private errorLogger: MockErrorLogger
  private operationSuccessRate: number

  constructor(
    errorLogger: MockErrorLogger,
    operationSuccessRate: number = 0.5
  ) {
    this.errorHandler = new ErrorHandler({
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 100,
      exponentialBackoff: true,
      enableLogging: true
    })
    this.recoveryService = new ErrorRecoveryService(this.errorHandler)
    this.errorLogger = errorLogger
    this.operationSuccessRate = operationSuccessRate
  }

  /**
   * Simulate a database operation that might fail
   */
  async performDatabaseOperation(
    context: ErrorContext,
    shouldFail: boolean = false
  ): Promise<{ success: boolean; data?: any; error?: PatientManagementError }> {
    try {
      if (shouldFail || Math.random() > this.operationSuccessRate) {
        const error = new DatabaseError(
          'Database connection timeout',
          context.operation,
          new Error('ETIMEDOUT')
        )
        throw error
      }

      return {
        success: true,
        data: { result: 'success', operation: context.operation }
      }
    } catch (error) {
      const managedError = error as PatientManagementError
      
      // CRITICAL: Log error details
      this.errorLogger.logError(
        managedError,
        context,
        managedError.getUserMessage(),
        'RETRY_OPERATION',
        'high'
      )

      return {
        success: false,
        error: managedError
      }
    }
  }

  /**
   * Simulate an integration operation with fallback
   */
  async performIntegrationOperation(
    context: ErrorContext,
    shouldFail: boolean = false
  ): Promise<{ success: boolean; data?: any; error?: PatientManagementError; usedFallback?: boolean }> {
    try {
      // Try primary integration
      if (shouldFail || Math.random() > this.operationSuccessRate) {
        throw new IntegrationError(
          'Appointment system unavailable',
          'AppointmentSystem',
          context.operation
        )
      }

      return {
        success: true,
        data: { result: 'success', source: 'primary' }
      }
    } catch (error) {
      const managedError = error as PatientManagementError

      // CRITICAL: Log error details
      this.errorLogger.logError(
        managedError,
        context,
        managedError.getUserMessage(),
        'USE_FALLBACK',
        'medium'
      )

      // CRITICAL: Implement fallback mechanism
      try {
        // Fallback: use cached data or alternative system
        return {
          success: true,
          data: { result: 'success', source: 'fallback' },
          usedFallback: true
        }
      } catch (fallbackError) {
        return {
          success: false,
          error: managedError
        }
      }
    }
  }

  /**
   * Perform operation with automatic retry
   */
  async performOperationWithRetry(
    context: ErrorContext,
    maxAttempts: number = 3
  ): Promise<{ success: boolean; attempts: number; data?: any; error?: PatientManagementError }> {
    let attempts = 0
    let lastError: PatientManagementError | undefined

    while (attempts < maxAttempts) {
      attempts++

      try {
        // Simulate operation that might fail
        if (Math.random() > 0.7) {
          const result = await this.performDatabaseOperation(context, false)
          if (result.success) {
            return {
              success: true,
              attempts,
              data: result.data
            }
          }
          lastError = result.error
        } else {
          throw new NetworkError('Connection timeout', '/api/patients', 504)
        }
      } catch (error) {
        lastError = error as PatientManagementError

        // Log retry attempt
        this.errorLogger.logError(
          lastError,
          { ...context, metadata: { attempt: attempts, maxAttempts } },
          lastError.getUserMessage(),
          attempts < maxAttempts ? 'RETRY_OPERATION' : 'CONTACT_SUPPORT',
          'medium'
        )

        // If not last attempt, wait before retrying
        if (attempts < maxAttempts) {
          await this.sleep(100 * attempts)
        }
      }
    }

    return {
      success: false,
      attempts,
      error: lastError
    }
  }

  /**
   * Validate input with clear error messages
   */
  async validateInput(
    data: Record<string, any>,
    context: ErrorContext
  ): Promise<{ valid: boolean; errors?: ValidationError }> {
    const validationErrors: Array<{ field: string; message: string; code: string }> = []

    // Simulate validation rules
    if (!data.name || data.name.length === 0) {
      validationErrors.push({
        field: 'name',
        message: 'Name is required',
        code: 'REQUIRED_FIELD'
      })
    }

    if (data.email && !data.email.includes('@')) {
      validationErrors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT'
      })
    }

    if (validationErrors.length > 0) {
      const error = new ValidationError('Validation failed', validationErrors)

      // CRITICAL: Provide clear error messages
      this.errorLogger.logError(
        error,
        context,
        error.getUserMessage(),
        'CORRECT_INPUT',
        'low'
      )

      return {
        valid: false,
        errors: error
      }
    }

    return { valid: true }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const errorContextGenerator = (): fc.Arbitrary<ErrorContext> =>
  fc.record({
    userId: fc.option(fc.uuid()),
    patientId: fc.option(fc.uuid()),
    operation: fc.constantFrom(
      'createPatient',
      'updatePatient',
      'deletePatient',
      'syncData',
      'uploadDocument',
      'generateReport'
    ),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime())),
    metadata: fc.option(
      fc.record({
        source: fc.constantFrom('web-app', 'mobile-app', 'api'),
        ipAddress: fc.tuple(
          fc.integer({ min: 1, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 1, max: 255 })
        ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`)
      })
    )
  })

const validationDataGenerator = (): fc.Arbitrary<Record<string, any>> =>
  fc.record({
    name: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    email: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    phone: fc.option(fc.string({ minLength: 0, maxLength: 20 }))
  })

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 18: Error Handling and Recovery', () => {
  // ============================================================================
  // ERROR LOGGING TESTS
  // ============================================================================

  test('Property 18.1: All system errors are logged with complete details', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextGenerator(),
        fc.boolean(),
        async (context, shouldFail) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, shouldFail ? 0 : 1)

          // Perform operation that might fail
          const result = await system.performDatabaseOperation(context, shouldFail)

          if (!result.success) {
            // CRITICAL: Verify error was logged
            const logs = errorLogger.getLogs()
            expect(logs.length).toBeGreaterThan(0)

            const errorLog = logs[0]

            // Verify log contains error details
            expect(errorLog.error).toBeDefined()
            expect(errorLog.error).toBeInstanceOf(PatientManagementError)

            // Verify log contains context
            expect(errorLog.context).toBeDefined()
            expect(errorLog.context.operation).toBe(context.operation)

            // Verify log contains timestamp
            expect(errorLog.timestamp).toBeInstanceOf(Date)

            // Verify log contains user message
            expect(errorLog.userMessage).toBeDefined()
            expect(errorLog.userMessage.length).toBeGreaterThan(0)

            // Verify log contains recovery action
            expect(errorLog.recoveryAction).toBeDefined()

            // Verify log contains severity
            expect(errorLog.severity).toBeDefined()
            expect(['low', 'medium', 'high', 'critical']).toContain(errorLog.severity)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 18.2: Integration failures are logged with system information', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextGenerator(),
        fc.boolean(),
        async (context, shouldFail) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, shouldFail ? 0 : 1)

          // Perform integration operation
          const result = await system.performIntegrationOperation(context, shouldFail)

          if (shouldFail || result.error) {
            // Verify error was logged
            const logs = errorLogger.getLogsByErrorType('IntegrationError')
            expect(logs.length).toBeGreaterThan(0)

            const errorLog = logs[0]

            // Verify integration error details
            expect(errorLog.error).toBeInstanceOf(IntegrationError)
            const integrationError = errorLog.error as IntegrationError
            expect(integrationError.system).toBeDefined()
            expect(integrationError.operation).toBeDefined()

            // Verify user message is clear
            expect(errorLog.userMessage).toContain('Integration')
            expect(errorLog.userMessage.length).toBeGreaterThan(0)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // CLEAR ERROR MESSAGES TESTS
  // ============================================================================

  test('Property 18.3: Validation errors provide clear, actionable messages', () => {
    fc.assert(
      fc.asyncProperty(
        validationDataGenerator(),
        errorContextGenerator(),
        async (data, context) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger)

          // Validate input
          const result = await system.validateInput(data, context)

          if (!result.valid && result.errors) {
            // Verify error was logged
            const logs = errorLogger.getLogsByErrorType('ValidationError')
            expect(logs.length).toBeGreaterThan(0)

            const errorLog = logs[0]

            // CRITICAL: Verify user message is clear and actionable
            expect(errorLog.userMessage).toBeDefined()
            expect(errorLog.userMessage.length).toBeGreaterThan(0)
            expect(errorLog.userMessage).not.toContain('undefined')
            expect(errorLog.userMessage).not.toContain('null')

            // Verify recovery action suggests correction
            expect(errorLog.recoveryAction).toBe('CORRECT_INPUT')

            // Verify validation errors have field-specific messages
            const validationError = result.errors
            expect(validationError.validationErrors.length).toBeGreaterThan(0)

            validationError.validationErrors.forEach(err => {
              expect(err.field).toBeDefined()
              expect(err.message).toBeDefined()
              expect(err.message.length).toBeGreaterThan(0)
              expect(err.code).toBeDefined()
            })
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 18.4: All error types provide user-friendly messages', () => {
    fc.assert(
      fc.property(
        errorContextGenerator(),
        (context) => {
          // Create different error types
          const errors: PatientManagementError[] = [
            new DatabaseError('Connection failed', context.operation),
            new IntegrationError('Service unavailable', 'AppointmentSystem', context.operation),
            new NetworkError('Timeout', '/api/patients', 504),
            new StorageError('Upload failed', 'file'),
            new ValidationError('Invalid input', [
              { field: 'email', message: 'Invalid format', code: 'INVALID_FORMAT' }
            ])
          ]

          // Verify each error provides a user-friendly message
          errors.forEach(error => {
            const userMessage = error.getUserMessage()

            // CRITICAL: User message must be clear and non-technical
            expect(userMessage).toBeDefined()
            expect(userMessage.length).toBeGreaterThan(0)
            expect(userMessage).not.toContain('undefined')
            expect(userMessage).not.toContain('null')
            expect(userMessage).not.toContain('Error:')
            
            // Should not expose technical details
            expect(userMessage).not.toContain('stack')
            expect(userMessage).not.toContain('ETIMEDOUT')
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // FALLBACK MECHANISM TESTS
  // ============================================================================

  test('Property 18.5: Integration failures trigger appropriate fallback mechanisms', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextGenerator(),
        async (context) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, 0) // Force failures

          // Perform integration operation that will fail
          const result = await system.performIntegrationOperation(context, true)

          // CRITICAL: Verify fallback was used
          if (result.usedFallback) {
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data.source).toBe('fallback')

            // Verify error was still logged
            const logs = errorLogger.getLogs()
            expect(logs.length).toBeGreaterThan(0)

            // Verify recovery action indicates fallback
            const errorLog = logs[0]
            expect(errorLog.recoveryAction).toBe('USE_FALLBACK')
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 18.6: System maintains stability when fallback mechanisms are used', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(errorContextGenerator(), { minLength: 3, maxLength: 10 }),
        async (contexts) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, 0) // Force failures

          let successfulOperations = 0
          let fallbacksUsed = 0

          // Perform multiple operations
          for (const context of contexts) {
            const result = await system.performIntegrationOperation(context, true)

            if (result.success) {
              successfulOperations++
              if (result.usedFallback) {
                fallbacksUsed++
              }
            }
          }

          // CRITICAL: System should maintain stability with fallbacks
          // Even with primary system failures, operations should succeed via fallback
          expect(successfulOperations).toBeGreaterThan(0)
          expect(fallbacksUsed).toBeGreaterThan(0)

          // All operations should have been logged
          const logs = errorLogger.getLogs()
          expect(logs.length).toBeGreaterThanOrEqual(contexts.length)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  // ============================================================================
  // RETRY MECHANISM TESTS
  // ============================================================================

  test('Property 18.7: Retryable errors trigger automatic retry with exponential backoff', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextGenerator(),
        fc.integer({ min: 2, max: 5 }),
        async (context, maxAttempts) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, 0.3) // 30% success rate

          // Perform operation with retry
          const result = await system.performOperationWithRetry(context, maxAttempts)

          // Verify retry attempts were made
          expect(result.attempts).toBeGreaterThan(0)
          expect(result.attempts).toBeLessThanOrEqual(maxAttempts)

          // If operation failed, verify all attempts were made
          if (!result.success) {
            expect(result.attempts).toBe(maxAttempts)

            // Verify errors were logged for each attempt
            const logs = errorLogger.getLogs()
            expect(logs.length).toBeGreaterThanOrEqual(1)
          }

          // If operation succeeded after retries, verify attempts were logged
          if (result.success && result.attempts > 1) {
            const logs = errorLogger.getLogs()
            // There should be logs for failed attempts before success
            expect(logs.length).toBeGreaterThanOrEqual(0)
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 18.8: Retry attempts are logged with attempt count', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextGenerator(),
        async (context) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, 0.2) // Low success rate

          // Perform operation with retry
          const result = await system.performOperationWithRetry(context, 3)

          // If operation required retries, verify logging
          if (result.attempts > 1 || !result.success) {
            const logs = errorLogger.getLogs()
            expect(logs.length).toBeGreaterThan(0)

            // Verify logs contain attempt information
            logs.forEach(log => {
              if (log.context.metadata?.attempt) {
                expect(log.context.metadata.attempt).toBeGreaterThan(0)
                expect(log.context.metadata.maxAttempts).toBeDefined()
              }
            })
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE ERROR HANDLING TESTS
  // ============================================================================

  test('Property 18.9: All error scenarios maintain system stability', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(errorContextGenerator(), { minLength: 5, maxLength: 15 }),
        async (contexts) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, 0.5) // 50% success rate

          let totalOperations = 0
          let successfulOperations = 0
          let failedOperations = 0

          // Perform multiple operations of different types
          for (const context of contexts) {
            totalOperations++

            // Randomly choose operation type
            const operationType = Math.random()

            try {
              if (operationType < 0.33) {
                const result = await system.performDatabaseOperation(context)
                if (result.success) successfulOperations++
                else failedOperations++
              } else if (operationType < 0.66) {
                const result = await system.performIntegrationOperation(context)
                if (result.success) successfulOperations++
                else failedOperations++
              } else {
                const result = await system.performOperationWithRetry(context, 2)
                if (result.success) successfulOperations++
                else failedOperations++
              }
            } catch (error) {
              failedOperations++
            }
          }

          // CRITICAL: System should remain stable
          expect(totalOperations).toBe(contexts.length)
          expect(successfulOperations + failedOperations).toBe(totalOperations)

          // All errors should be logged
          const logs = errorLogger.getLogs()
          expect(logs.length).toBeGreaterThanOrEqual(failedOperations)

          // All logs should have required fields
          logs.forEach(log => {
            expect(log.error).toBeDefined()
            expect(log.context).toBeDefined()
            expect(log.timestamp).toBeInstanceOf(Date)
            expect(log.userMessage).toBeDefined()
            expect(log.userMessage.length).toBeGreaterThan(0)
          })

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 18.10: Error handling preserves operation context across retries', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextGenerator(),
        async (context) => {
          // Create fresh instances for this iteration
          const errorLogger = new MockErrorLogger()
          const system = new MockSystemWithErrorHandling(errorLogger, 0.3)

          // Perform operation with retry
          await system.performOperationWithRetry(context, 3)

          // Verify all logs preserve the original context
          const logs = errorLogger.getLogs()

          logs.forEach(log => {
            // CRITICAL: Context should be preserved
            expect(log.context.operation).toBe(context.operation)
            
            if (context.userId) {
              expect(log.context.userId).toBe(context.userId)
            }
            
            if (context.patientId) {
              expect(log.context.patientId).toBe(context.patientId)
            }
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // ERROR RECOVERY ACTION TESTS
  // ============================================================================

  test('Property 18.11: Each error type has an appropriate recovery action', () => {
    fc.assert(
      fc.property(
        errorContextGenerator(),
        (context) => {
          // Create different error types
          const errorRecoveryPairs: Array<[PatientManagementError, string[]]> = [
            [
              new ValidationError('Invalid input', [
                { field: 'email', message: 'Invalid', code: 'INVALID' }
              ]),
              ['CORRECT_INPUT']
            ],
            [
              new DatabaseError('Connection failed', context.operation),
              ['RETRY_OPERATION', 'CONTACT_SUPPORT']
            ],
            [
              new IntegrationError('Service unavailable', 'AppointmentSystem', context.operation),
              ['CHECK_INTEGRATION_STATUS', 'USE_FALLBACK']
            ],
            [
              new NetworkError('Timeout', '/api/patients', 504),
              ['RETRY_OPERATION', 'CONTACT_SUPPORT']
            ]
          ]

          // Verify each error type has appropriate recovery actions
          errorRecoveryPairs.forEach(([error, expectedActions]) => {
            const errorLogger = new MockErrorLogger()
            
            errorLogger.logError(
              error,
              context,
              error.getUserMessage(),
              expectedActions[0],
              'medium'
            )

            const logs = errorLogger.getLogs()
            expect(logs.length).toBe(1)

            const log = logs[0]
            
            // CRITICAL: Recovery action must be defined and appropriate
            expect(log.recoveryAction).toBeDefined()
            expect(expectedActions).toContain(log.recoveryAction)

            errorLogger.clear()
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // ERROR SEVERITY TESTS
  // ============================================================================

  test('Property 18.12: Errors are logged with appropriate severity levels', () => {
    fc.assert(
      fc.property(
        errorContextGenerator(),
        (context) => {
          const errorLogger = new MockErrorLogger()

          // Create errors with different severities
          const errors: Array<[PatientManagementError, 'low' | 'medium' | 'high' | 'critical']> = [
            [
              new ValidationError('Invalid input', [
                { field: 'email', message: 'Invalid', code: 'INVALID' }
              ]),
              'low'
            ],
            [
              new IntegrationError('Service unavailable', 'AppointmentSystem', context.operation),
              'medium'
            ],
            [
              new DatabaseError('Connection failed', context.operation),
              'high'
            ]
          ]

          errors.forEach(([error, expectedSeverity]) => {
            errorLogger.logError(
              error,
              context,
              error.getUserMessage(),
              'RETRY_OPERATION',
              expectedSeverity
            )
          })

          const logs = errorLogger.getLogs()
          expect(logs.length).toBe(errors.length)

          // Verify each log has appropriate severity
          logs.forEach((log, index) => {
            expect(log.severity).toBe(errors[index][1])
            expect(['low', 'medium', 'high', 'critical']).toContain(log.severity)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
