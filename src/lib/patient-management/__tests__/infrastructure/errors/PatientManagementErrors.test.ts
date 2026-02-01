// ============================================================================
// PATIENT MANAGEMENT ERRORS TESTS
// Unit tests for custom error classes
// ============================================================================

import {
  ValidationError,
  ResourceNotFoundError,
  AuthorizationError,
  DatabaseError,
  IntegrationError,
  ErrorFactory
} from '../../../infrastructure/errors'

describe('PatientManagementErrors', () => {
  describe('ValidationError', () => {
    it('should create validation error with multiple field errors', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format', code: 'INVALID_EMAIL' },
        { field: 'phone', message: 'Phone number required', code: 'REQUIRED_FIELD' }
      ]

      const error = new ValidationError('Validation failed', validationErrors)

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.validationErrors).toHaveLength(2)
      expect(error.field).toBe('email')
      expect(error.getUserMessage()).toContain('Validation failed')
    })

    it('should provide user-friendly message for single error', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' }
      ])

      expect(error.getUserMessage()).toBe('Invalid email')
    })

    it('should provide user-friendly message for multiple errors', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' },
        { field: 'phone', message: 'Required', code: 'REQUIRED' }
      ])

      expect(error.getUserMessage()).toContain('2 errors found')
    })

    it('should serialize to JSON', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid', code: 'INVALID_EMAIL' }
      ])

      const json = error.toJSON()

      expect(json.name).toBe('ValidationError')
      expect(json.code).toBe('VALIDATION_ERROR')
      expect(json.message).toBe('Validation failed')
      expect(json.timestamp).toBeDefined()
    })
  })

  describe('ResourceNotFoundError', () => {
    it('should create resource not found error', () => {
      const error = new ResourceNotFoundError('Patient', 'patient-123')

      expect(error.code).toBe('RESOURCE_NOT_FOUND')
      expect(error.resourceType).toBe('Patient')
      expect(error.resourceId).toBe('patient-123')
      expect(error.message).toContain('Patient with ID patient-123 not found')
    })

    it('should provide user-friendly message', () => {
      const error = new ResourceNotFoundError('Patient', 'patient-123')

      expect(error.getUserMessage()).toBe('The requested patient could not be found.')
    })
  })

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError('user-123', 'Patient', 'delete')

      expect(error.code).toBe('AUTHORIZATION_ERROR')
      expect(error.userId).toBe('user-123')
      expect(error.resource).toBe('Patient')
      expect(error.action).toBe('delete')
    })

    it('should provide user-friendly message', () => {
      const error = new AuthorizationError('user-123', 'Patient', 'delete')

      expect(error.getUserMessage()).toBe('You do not have permission to perform this action.')
    })
  })

  describe('DatabaseError', () => {
    it('should create database error', () => {
      const originalError = new Error('Connection timeout')
      const error = new DatabaseError('Database operation failed', 'query', originalError)

      expect(error.code).toBe('DATABASE_ERROR')
      expect(error.operation).toBe('query')
      expect(error.originalError).toBe(originalError)
    })

    it('should provide user-friendly message', () => {
      const error = new DatabaseError('Database operation failed', 'query')

      expect(error.getUserMessage()).toBe('A database error occurred. Please try again later.')
    })
  })

  describe('IntegrationError', () => {
    it('should create integration error', () => {
      const originalError = new Error('Service unavailable')
      const error = new IntegrationError(
        'Integration failed',
        'AppointmentSystem',
        'syncData',
        originalError
      )

      expect(error.code).toBe('INTEGRATION_ERROR')
      expect(error.system).toBe('AppointmentSystem')
      expect(error.operation).toBe('syncData')
      expect(error.originalError).toBe(originalError)
    })

    it('should provide user-friendly message', () => {
      const error = new IntegrationError(
        'Integration failed',
        'AppointmentSystem',
        'syncData'
      )

      expect(error.getUserMessage()).toContain('AppointmentSystem')
      expect(error.getUserMessage()).toContain('retried automatically')
    })
  })

  describe('ErrorFactory', () => {
    it('should create validation error', () => {
      const error = ErrorFactory.createValidationError([
        { field: 'email', message: 'Invalid', code: 'INVALID_EMAIL' }
      ])

      expect(error).toBeInstanceOf(ValidationError)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should create not found error', () => {
      const error = ErrorFactory.createNotFoundError('Patient', 'patient-123')

      expect(error).toBeInstanceOf(ResourceNotFoundError)
      expect(error.resourceType).toBe('Patient')
      expect(error.resourceId).toBe('patient-123')
    })

    it('should create authorization error', () => {
      const error = ErrorFactory.createAuthorizationError(
        'user-123',
        'Patient',
        'delete'
      )

      expect(error).toBeInstanceOf(AuthorizationError)
      expect(error.userId).toBe('user-123')
    })

    it('should create database error', () => {
      const originalError = new Error('Connection failed')
      const error = ErrorFactory.createDatabaseError(
        'Database error',
        'query',
        originalError
      )

      expect(error).toBeInstanceOf(DatabaseError)
      expect(error.operation).toBe('query')
      expect(error.originalError).toBe(originalError)
    })

    it('should create integration error', () => {
      const error = ErrorFactory.createIntegrationError(
        'Integration failed',
        'AppointmentSystem',
        'syncData'
      )

      expect(error).toBeInstanceOf(IntegrationError)
      expect(error.system).toBe('AppointmentSystem')
      expect(error.operation).toBe('syncData')
    })
  })

  describe('Error Context', () => {
    it('should include context in error', () => {
      const context = {
        userId: 'user-123',
        patientId: 'patient-456',
        operation: 'updatePatient'
      }

      const error = new ValidationError(
        'Validation failed',
        [{ field: 'email', message: 'Invalid', code: 'INVALID_EMAIL' }],
        context
      )

      expect(error.context).toEqual(context)
    })

    it('should include timestamp', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid', code: 'INVALID_EMAIL' }
      ])

      expect(error.timestamp).toBeInstanceOf(Date)
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })
})
