// ============================================================================
// ERROR HANDLER TESTS
// Unit tests for error handler with retry and fallback mechanisms
// ============================================================================

import {
  ErrorHandler,
  ValidationError,
  DatabaseError,
  IntegrationError,
  SecurityViolationError,
  LGPDComplianceError,
  type ErrorContext
} from '../../../infrastructure/errors'

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler
  let context: ErrorContext

  beforeEach(() => {
    errorHandler = new ErrorHandler({
      enableRetry: true,
      maxRetries: 3,
      exponentialBackoff: true,
      enableLogging: false, // Disable logging in tests
      enableIncidentReporting: false
    })

    context = {
      userId: 'user-123',
      operation: 'testOperation',
      timestamp: new Date()
    }
  })

  describe('handleError', () => {
    it('should handle validation error', async () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid', code: 'INVALID_EMAIL' }
      ])

      const result = await errorHandler.handleError(error, context)

      expect(result.success).toBe(false)
      expect(result.error).toBe(error)
      expect(result.userMessage).toBeDefined()
      expect(result.recoveryAction).toBe('CORRECT_INPUT')
    })

    it('should handle database error', async () => {
      const error = new DatabaseError('Connection failed', 'query')

      const result = await errorHandler.handleError(error, context)

      expect(result.success).toBe(false)
      expect(result.recoveryAction).toBe('RETRY_OPERATION')
    })

    it('should normalize generic errors', async () => {
      const error = new Error('Something went wrong')

      const result = await errorHandler.handleError(error, context)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await errorHandler.executeWithRetry(operation, context)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable error', async () => {
      let attempts = 0
      const operation = jest.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new DatabaseError('Connection failed', 'query')
        }
        return 'success'
      })

      const result = await errorHandler.executeWithRetry(operation, context)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-retryable error', async () => {
      const operation = jest.fn().mockRejectedValue(
        new ValidationError('Validation failed', [
          { field: 'email', message: 'Invalid', code: 'INVALID_EMAIL' }
        ])
      )

      await expect(
        errorHandler.executeWithRetry(operation, context)
      ).rejects.toThrow(ValidationError)

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should throw after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(
        new DatabaseError('Connection failed', 'query')
      )

      await expect(
        errorHandler.executeWithRetry(operation, context)
      ).rejects.toThrow(DatabaseError)

      expect(operation).toHaveBeenCalledTimes(3)
    })
  })

  describe('executeWithFallback', () => {
    it('should succeed with primary operation', async () => {
      const primary = jest.fn().mockResolvedValue('primary')
      const fallback = jest.fn().mockResolvedValue('fallback')

      const result = await errorHandler.executeWithFallback(
        [primary, fallback],
        context
      )

      expect(result).toBe('primary')
      expect(primary).toHaveBeenCalledTimes(1)
      expect(fallback).not.toHaveBeenCalled()
    })

    it('should use fallback when primary fails', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Primary failed'))
      const fallback = jest.fn().mockResolvedValue('fallback')

      const result = await errorHandler.executeWithFallback(
        [primary, fallback],
        context
      )

      expect(result).toBe('fallback')
      expect(primary).toHaveBeenCalledTimes(1)
      expect(fallback).toHaveBeenCalledTimes(1)
    })

    it('should try all fallbacks', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Primary failed'))
      const fallback1 = jest.fn().mockRejectedValue(new Error('Fallback 1 failed'))
      const fallback2 = jest.fn().mockResolvedValue('fallback2')

      const result = await errorHandler.executeWithFallback(
        [primary, fallback1, fallback2],
        context
      )

      expect(result).toBe('fallback2')
      expect(primary).toHaveBeenCalledTimes(1)
      expect(fallback1).toHaveBeenCalledTimes(1)
      expect(fallback2).toHaveBeenCalledTimes(1)
    })

    it('should throw when all fallbacks fail', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Primary failed'))
      const fallback = jest.fn().mockRejectedValue(new Error('Fallback failed'))

      await expect(
        errorHandler.executeWithFallback([primary, fallback], context)
      ).rejects.toThrow()

      expect(primary).toHaveBeenCalledTimes(1)
      expect(fallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleValidationError', () => {
    it('should handle validation errors', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' },
        { field: 'phone', message: 'Required', code: 'REQUIRED' }
      ]

      const result = errorHandler.handleValidationError(validationErrors, context)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.userMessage).toBeDefined()
    })
  })

  describe('handleSecurityViolation', () => {
    it('should create incident report for security violations', async () => {
      const incidentHandler = new ErrorHandler({
        enableIncidentReporting: true,
        enableLogging: false
      })

      const error = new SecurityViolationError(
        'Unauthorized access attempt',
        'UNAUTHORIZED_ACCESS',
        'high'
      )

      const result = await incidentHandler.handleSecurityViolation(error, context)

      expect(result.success).toBe(false)
      expect(result.recoveryAction).toBe('SECURITY_REVIEW_REQUIRED')

      const incidents = incidentHandler.getIncidentReports()
      expect(incidents.length).toBeGreaterThan(0)
    })
  })

  describe('handleLGPDViolation', () => {
    it('should create incident report for LGPD violations', async () => {
      const incidentHandler = new ErrorHandler({
        enableIncidentReporting: true,
        enableLogging: false
      })

      const error = new LGPDComplianceError(
        'Data access without consent',
        'CONSENT_REQUIRED',
        'violation'
      )

      const result = await incidentHandler.handleLGPDViolation(error, context)

      expect(result.success).toBe(false)
      expect(result.recoveryAction).toBe('COMPLIANCE_REVIEW_REQUIRED')

      const incidents = incidentHandler.getIncidentReports()
      expect(incidents.length).toBeGreaterThan(0)
    })
  })

  describe('Incident Reports', () => {
    let incidentHandler: ErrorHandler

    beforeEach(() => {
      incidentHandler = new ErrorHandler({
        enableIncidentReporting: true,
        enableLogging: false
      })
    })

    it('should create incident report for critical errors', async () => {
      const error = new SecurityViolationError(
        'Critical security violation',
        'CRITICAL_VIOLATION',
        'critical'
      )

      await incidentHandler.handleSecurityViolation(error, context)

      const incidents = incidentHandler.getIncidentReports()
      expect(incidents.length).toBe(1)
      expect(incidents[0].severity).toBe('critical')
      expect(incidents[0].resolved).toBe(false)
    })

    it('should retrieve incident by ID', async () => {
      const error = new SecurityViolationError(
        'Security violation',
        'VIOLATION',
        'high'
      )

      await incidentHandler.handleSecurityViolation(error, context)

      const incidents = incidentHandler.getIncidentReports()
      const incident = incidentHandler.getIncidentReport(incidents[0].id)

      expect(incident).toBeDefined()
      expect(incident?.id).toBe(incidents[0].id)
    })

    it('should resolve incident', async () => {
      const error = new SecurityViolationError(
        'Security violation',
        'VIOLATION',
        'high'
      )

      await incidentHandler.handleSecurityViolation(error, context)

      const incidents = incidentHandler.getIncidentReports()
      const incidentId = incidents[0].id

      incidentHandler.resolveIncident(incidentId, 'Issue resolved')

      const resolvedIncident = incidentHandler.getIncidentReport(incidentId)
      expect(resolvedIncident?.resolved).toBe(true)
      expect(resolvedIncident?.resolutionNotes).toBe('Issue resolved')
    })
  })

  describe('Error Normalization', () => {
    it('should normalize not found errors', async () => {
      const error = new Error('Resource not found')

      const result = await errorHandler.handleError(error, context)

      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND')
    })

    it('should normalize authorization errors', async () => {
      const error = new Error('User unauthorized to access resource')

      const result = await errorHandler.handleError(error, context)

      expect(result.error?.code).toBe('AUTHORIZATION_ERROR')
    })

    it('should normalize database errors', async () => {
      const error = new Error('Database query failed')

      const result = await errorHandler.handleError(error, context)

      expect(result.error?.code).toBe('DATABASE_ERROR')
    })
  })
})
