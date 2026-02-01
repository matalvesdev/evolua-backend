// ============================================================================
// ERROR HANDLING USAGE EXAMPLES
// Demonstrates how to use the error handling and recovery system
// ============================================================================

import {
  ErrorHandler,
  ErrorRecoveryService,
  globalErrorHandler,
  ValidationError,
  ResourceNotFoundError,
  IntegrationError,
  DatabaseError,
  ErrorFactory,
  type ErrorContext
} from '../infrastructure/errors'
import { PatientRegistry } from '../application/services/PatientRegistry'
import { PatientId } from '../domain/value-objects/PatientId'

// ============================================================================
// EXAMPLE 1: Basic Error Handling
// ============================================================================

async function basicErrorHandlingExample() {
  const context: ErrorContext = {
    userId: 'user-123',
    operation: 'createPatient',
    timestamp: new Date()
  }

  try {
    // Some operation that might fail
    throw new ValidationError(
      'Validation failed',
      [
        { field: 'email', message: 'Invalid email format', code: 'INVALID_EMAIL' },
        { field: 'phone', message: 'Phone number required', code: 'REQUIRED_FIELD' }
      ]
    )
  } catch (error) {
    const result = await globalErrorHandler.handleError(error as Error, context)
    
    console.log('Error handled:', {
      success: result.success,
      userMessage: result.userMessage,
      recoveryAction: result.recoveryAction
    })
  }
}

// ============================================================================
// EXAMPLE 2: Automatic Retry with Error Handler
// ============================================================================

async function retryExample() {
  const errorHandler = new ErrorHandler({
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  })

  const context: ErrorContext = {
    userId: 'user-123',
    operation: 'fetchPatient',
    timestamp: new Date()
  }

  try {
    const result = await errorHandler.executeWithRetry(
      async () => {
        // Simulated database operation that might fail
        const random = Math.random()
        if (random < 0.7) {
          throw new DatabaseError(
            'Connection timeout',
            'findById',
            new Error('ETIMEDOUT')
          )
        }
        return { id: '123', name: 'John Doe' }
      },
      context
    )

    console.log('Operation succeeded:', result)
  } catch (error) {
    console.error('Operation failed after retries:', error)
  }
}

// ============================================================================
// EXAMPLE 3: Fallback Strategies
// ============================================================================

async function fallbackExample() {
  const errorHandler = new ErrorHandler()
  
  const context: ErrorContext = {
    userId: 'user-123',
    operation: 'getPatientData',
    timestamp: new Date()
  }

  try {
    const result = await errorHandler.executeWithFallback(
      [
        // Primary: Try to get from cache
        async () => {
          console.log('Attempting cache...')
          throw new Error('Cache miss')
        },
        // Fallback 1: Try to get from database
        async () => {
          console.log('Attempting database...')
          throw new DatabaseError('Database unavailable', 'query')
        },
        // Fallback 2: Try to get from backup
        async () => {
          console.log('Attempting backup...')
          return { id: '123', name: 'John Doe', source: 'backup' }
        }
      ],
      context
    )

    console.log('Data retrieved:', result)
  } catch (error) {
    console.error('All fallback strategies failed:', error)
  }
}

// ============================================================================
// EXAMPLE 4: Error Recovery Service
// ============================================================================

async function errorRecoveryExample() {
  const errorHandler = new ErrorHandler()
  const recoveryService = new ErrorRecoveryService(errorHandler)

  const context: ErrorContext = {
    userId: 'user-123',
    operation: 'syncPatientData',
    timestamp: new Date()
  }

  try {
    const result = await recoveryService.executeWithRecovery(
      async () => {
        // Simulated operation that might fail
        throw new IntegrationError(
          'Appointment system unavailable',
          'AppointmentSystem',
          'syncData'
        )
      },
      context,
      3 // max recovery attempts
    )

    console.log('Operation succeeded with recovery:', result)
  } catch (error) {
    console.error('Operation failed after recovery attempts:', error)
  }
}

// ============================================================================
// EXAMPLE 5: Circuit Breaker for Integration
// ============================================================================

async function circuitBreakerExample() {
  const errorHandler = new ErrorHandler()
  const recoveryService = new ErrorRecoveryService(errorHandler)
  const integrationStrategy = recoveryService.getIntegrationStrategy()

  // Execute multiple operations with circuit breaker
  for (let i = 0; i < 10; i++) {
    try {
      const result = await integrationStrategy.executeWithCircuitBreaker(
        'AppointmentSystem',
        async () => {
          // Simulated integration call
          const random = Math.random()
          if (random < 0.6) {
            throw new IntegrationError(
              'Service unavailable',
              'AppointmentSystem',
              'getData'
            )
          }
          return { data: 'success' }
        },
        async () => {
          // Fallback when circuit is open
          console.log('Circuit breaker open - using fallback')
          return { data: 'fallback' }
        }
      )

      console.log(`Request ${i + 1}:`, result)
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error)
    }

    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// ============================================================================
// EXAMPLE 6: Validation Error Handling
// ============================================================================

async function validationErrorExample(patientRegistry: PatientRegistry) {
  const context: ErrorContext = {
    userId: 'user-123',
    operation: 'createPatient',
    timestamp: new Date()
  }

  try {
    await patientRegistry.createPatient(
      {
        personalInfo: {
          fullName: '', // Invalid: empty name
          dateOfBirth: new Date('2030-01-01'), // Invalid: future date
          gender: 'male',
          cpf: '123', // Invalid: wrong format
          rg: 'MG-12345678'
        },
        contactInfo: {
          primaryPhone: 'invalid', // Invalid: wrong format
          address: {
            street: 'Main St',
            number: '123',
            neighborhood: 'Downtown',
            city: 'City',
            state: 'ST',
            zipCode: '12345'
          }
        },
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'spouse',
          phone: '(11) 98765-4321'
        }
      },
      'user-123'
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('Validation errors:', error.validationErrors)
      console.log('User message:', error.getUserMessage())
      
      // Display errors to user
      error.validationErrors.forEach(err => {
        console.log(`- ${err.field}: ${err.message}`)
      })
    }
  }
}

// ============================================================================
// EXAMPLE 7: Security Violation Handling
// ============================================================================

async function securityViolationExample() {
  const errorHandler = new ErrorHandler({
    enableIncidentReporting: true
  })

  const context: ErrorContext = {
    userId: 'user-123',
    patientId: 'patient-456',
    operation: 'accessPatientData',
    timestamp: new Date()
  }

  try {
    // Simulated security violation
    const error = ErrorFactory.createAuthorizationError(
      'user-123',
      'Patient',
      'view',
      { attemptedPatientId: 'patient-456' }
    )

    const result = await errorHandler.handleError(error, context)
    
    console.log('Security violation handled:', {
      userMessage: result.userMessage,
      recoveryAction: result.recoveryAction
    })

    // Check incident reports
    const incidents = errorHandler.getIncidentReports()
    console.log('Incident reports:', incidents)
  } catch (error) {
    console.error('Failed to handle security violation:', error)
  }
}

// ============================================================================
// EXAMPLE 8: Custom Error Factory Usage
// ============================================================================

function errorFactoryExample() {
  // Create validation error
  const validationError = ErrorFactory.createValidationError(
    [
      { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' },
      { field: 'phone', message: 'Required field', code: 'REQUIRED' }
    ],
    { userId: 'user-123' }
  )

  // Create not found error
  const notFoundError = ErrorFactory.createNotFoundError(
    'Patient',
    'patient-123',
    { operation: 'getPatient' }
  )

  // Create authorization error
  const authError = ErrorFactory.createAuthorizationError(
    'user-123',
    'Patient',
    'delete',
    { patientId: 'patient-456' }
  )

  // Create database error
  const dbError = ErrorFactory.createDatabaseError(
    'Connection timeout',
    'query',
    new Error('ETIMEDOUT'),
    { query: 'SELECT * FROM patients' }
  )

  // Create integration error
  const integrationError = ErrorFactory.createIntegrationError(
    'Service unavailable',
    'AppointmentSystem',
    'syncData',
    new Error('503 Service Unavailable'),
    { endpoint: '/api/appointments' }
  )

  console.log('Created errors:', {
    validationError: validationError.toJSON(),
    notFoundError: notFoundError.toJSON(),
    authError: authError.toJSON(),
    dbError: dbError.toJSON(),
    integrationError: integrationError.toJSON()
  })
}

// ============================================================================
// EXAMPLE 9: Complete Patient Operation with Error Handling
// ============================================================================

async function completePatientOperationExample(patientRegistry: PatientRegistry) {
  const errorHandler = new ErrorHandler({
    enableRetry: true,
    maxRetries: 3,
    exponentialBackoff: true
  })

  const recoveryService = new ErrorRecoveryService(errorHandler)

  const context: ErrorContext = {
    userId: 'user-123',
    operation: 'createPatient',
    timestamp: new Date(),
    metadata: {
      source: 'web-app',
      ipAddress: '192.168.1.1'
    }
  }

  try {
    const patient = await recoveryService.executeWithRecovery(
      async () => {
        return await patientRegistry.createPatient(
          {
            personalInfo: {
              fullName: 'John Doe',
              dateOfBirth: new Date('1990-01-01'),
              gender: 'male',
              cpf: '123.456.789-00',
              rg: 'MG-12345678'
            },
            contactInfo: {
              primaryPhone: '(11) 98765-4321',
              email: 'john.doe@example.com',
              address: {
                street: 'Main Street',
                number: '123',
                neighborhood: 'Downtown',
                city: 'São Paulo',
                state: 'SP',
                zipCode: '01234-567'
              }
            },
            emergencyContact: {
              name: 'Jane Doe',
              relationship: 'spouse',
              phone: '(11) 98765-4322'
            }
          },
          'user-123'
        )
      },
      context,
      3
    )

    console.log('Patient created successfully:', patient.id.value)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation failed:', error.validationErrors)
    } else if (error instanceof ResourceNotFoundError) {
      console.error('Resource not found:', error.resourceId)
    } else if (error instanceof DatabaseError) {
      console.error('Database error:', error.operation)
    } else {
      console.error('Unexpected error:', error)
    }

    // Handle error and get user-friendly message
    const result = await errorHandler.handleError(error as Error, context)
    console.log('User message:', result.userMessage)
    console.log('Recovery action:', result.recoveryAction)
  }
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

export {
  basicErrorHandlingExample,
  retryExample,
  fallbackExample,
  errorRecoveryExample,
  circuitBreakerExample,
  validationErrorExample,
  securityViolationExample,
  errorFactoryExample,
  completePatientOperationExample
}
