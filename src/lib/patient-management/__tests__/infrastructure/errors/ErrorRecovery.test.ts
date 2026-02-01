// ============================================================================
// ERROR RECOVERY TESTS
// Unit tests for error recovery strategies and circuit breaker
// ============================================================================

import {
  ErrorRecoveryService,
  CircuitBreaker,
  DatabaseRecoveryStrategy,
  IntegrationRecoveryStrategy,
  StorageRecoveryStrategy,
  NetworkRecoveryStrategy,
  ErrorHandler,
  DatabaseError,
  IntegrationError,
  StorageError,
  NetworkError,
  type ErrorContext
} from '../../../infrastructure/errors'

describe('ErrorRecovery', () => {
  let errorHandler: ErrorHandler
  let recoveryService: ErrorRecoveryService
  let context: ErrorContext

  beforeEach(() => {
    errorHandler = new ErrorHandler({ enableLogging: false })
    recoveryService = new ErrorRecoveryService(errorHandler)
    context = {
      userId: 'user-123',
      operation: 'testOperation',
      timestamp: new Date()
    }
  })

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 5000
      })
    })

    it('should start in closed state', () => {
      const state = circuitBreaker.getState()
      expect(state.state).toBe('closed')
      expect(state.failures).toBe(0)
    })

    it('should execute successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await circuitBreaker.execute(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should open circuit after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'))

      // Cause failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation)
        } catch (error) {
          // Expected
        }
      }

      const state = circuitBreaker.getState()
      expect(state.state).toBe('open')
      expect(state.failures).toBe(3)
    })

    it('should use fallback when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'))
      const fallback = jest.fn().mockResolvedValue('fallback')

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation)
        } catch (error) {
          // Expected
        }
      }

      // Try operation with fallback
      const result = await circuitBreaker.execute(operation, fallback)

      expect(result).toBe('fallback')
      expect(fallback).toHaveBeenCalled()
    })

    it('should throw when circuit is open without fallback', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'))

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation)
        } catch (error) {
          // Expected
        }
      }

      // Try operation without fallback
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        'Circuit breaker is open'
      )
    })

    it('should attempt reset after timeout', async () => {
      jest.useFakeTimers()

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('success')

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation)
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState().state).toBe('open')

      // Advance time past reset timeout
      jest.advanceTimersByTime(1100)

      // Try operation again - should attempt reset
      const result = await circuitBreaker.execute(operation)

      expect(result).toBe('success')
      expect(circuitBreaker.getState().state).toBe('closed')

      jest.useRealTimers()
    })
  })

  describe('DatabaseRecoveryStrategy', () => {
    let strategy: DatabaseRecoveryStrategy

    beforeEach(() => {
      strategy = new DatabaseRecoveryStrategy()
    })

    it('should handle database errors', () => {
      const error = new DatabaseError('Connection failed', 'query')
      expect(strategy.canHandle(error)).toBe(true)
    })

    it('should identify connection errors', async () => {
      const error = new DatabaseError('Connection timeout', 'query')

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(false)
      expect(result.message).toContain('connection')
    })

    it('should identify constraint violations', async () => {
      const error = new DatabaseError('Unique constraint violation', 'insert')

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(true)
      expect(result.message).toContain('constraint')
    })

    it('should identify deadlocks', async () => {
      const error = new DatabaseError('Deadlock detected', 'update')

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(false)
      expect(result.message).toContain('deadlock')
    })
  })

  describe('IntegrationRecoveryStrategy', () => {
    let strategy: IntegrationRecoveryStrategy

    beforeEach(() => {
      strategy = new IntegrationRecoveryStrategy()
    })

    it('should handle integration errors', () => {
      const error = new IntegrationError(
        'Service unavailable',
        'AppointmentSystem',
        'syncData'
      )
      expect(strategy.canHandle(error)).toBe(true)
    })

    it('should provide recovery message for integration errors', async () => {
      const error = new IntegrationError(
        'Service unavailable',
        'AppointmentSystem',
        'syncData'
      )

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.message).toContain('AppointmentSystem')
      expect(result.message).toContain('Retrying')
    })

    it('should execute with circuit breaker', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await strategy.executeWithCircuitBreaker(
        'TestSystem',
        operation
      )

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should use fallback when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'))
      const fallback = jest.fn().mockResolvedValue('fallback')

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await strategy.executeWithCircuitBreaker('TestSystem', operation)
        } catch (error) {
          // Expected
        }
      }

      // Try with fallback
      const result = await strategy.executeWithCircuitBreaker(
        'TestSystem',
        operation,
        fallback
      )

      expect(result).toBe('fallback')
    })
  })

  describe('StorageRecoveryStrategy', () => {
    let strategy: StorageRecoveryStrategy

    beforeEach(() => {
      strategy = new StorageRecoveryStrategy()
    })

    it('should handle storage errors', () => {
      const error = new StorageError('File not found', 'file')
      expect(strategy.canHandle(error)).toBe(true)
    })

    it('should handle file storage errors', async () => {
      const error = new StorageError('File upload failed', 'file')

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(true)
    })

    it('should handle cache errors with fallback', async () => {
      const error = new StorageError('Cache miss', 'cache')

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(true)
      expect(result.requiresManualIntervention).toBe(false)
      expect(result.message).toContain('database')
    })
  })

  describe('NetworkRecoveryStrategy', () => {
    let strategy: NetworkRecoveryStrategy

    beforeEach(() => {
      strategy = new NetworkRecoveryStrategy()
    })

    it('should handle network errors', () => {
      const error = new NetworkError('Connection failed')
      expect(strategy.canHandle(error)).toBe(true)
    })

    it('should handle timeout errors', async () => {
      const error = new NetworkError('Request timeout')

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(false)
      expect(result.message).toContain('timeout')
    })

    it('should handle connection errors', async () => {
      const error = new NetworkError('Network connection lost')

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(true)
      expect(result.message).toContain('connection')
    })

    it('should handle server errors', async () => {
      const error = new NetworkError('Server error', '/api/patients', 500)

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(false)
      expect(result.message).toContain('Server error')
    })

    it('should handle rate limiting', async () => {
      const error = new NetworkError('Too many requests', '/api/patients', 429)

      const result = await strategy.recover(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(true)
      expect(result.message).toContain('Rate limit')
    })
  })

  describe('ErrorRecoveryService', () => {
    it('should attempt recovery for database errors', async () => {
      const error = new DatabaseError('Connection failed', 'query')

      const result = await recoveryService.attemptRecovery(error, context)

      expect(result.success).toBe(false)
      expect(result.message).toBeDefined()
    })

    it('should attempt recovery for integration errors', async () => {
      const error = new IntegrationError(
        'Service unavailable',
        'AppointmentSystem',
        'syncData'
      )

      const result = await recoveryService.attemptRecovery(error, context)

      expect(result.success).toBe(false)
      expect(result.message).toBeDefined()
    })

    it('should return no strategy available for unsupported errors', async () => {
      const error = new Error('Unsupported error') as any
      error.code = 'UNSUPPORTED_ERROR'
      error.getUserMessage = () => 'Unsupported error'

      const result = await recoveryService.attemptRecovery(error, context)

      expect(result.success).toBe(false)
      expect(result.requiresManualIntervention).toBe(true)
      expect(result.message).toContain('No recovery strategy')
    })

    it('should execute operation with recovery', async () => {
      let attempts = 0
      const operation = jest.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 2) {
          throw new DatabaseError('Connection failed', 'query')
        }
        return 'success'
      })

      const result = await recoveryService.executeWithRecovery(
        operation,
        context,
        3
      )

      expect(result).toBe('success')
      expect(attempts).toBe(2)
    })

    it('should throw after max recovery attempts', async () => {
      const operation = jest.fn().mockRejectedValue(
        new DatabaseError('Connection failed', 'query')
      )

      await expect(
        recoveryService.executeWithRecovery(operation, context, 3)
      ).rejects.toThrow(DatabaseError)
    })

    it('should add custom recovery strategy', async () => {
      const customStrategy = {
        name: 'CustomStrategy',
        canHandle: (error: any) => error.code === 'CUSTOM_ERROR',
        recover: async () => ({
          success: true,
          message: 'Custom recovery',
          requiresManualIntervention: false
        })
      }

      recoveryService.addStrategy(customStrategy)

      const error = new Error('Custom error') as any
      error.code = 'CUSTOM_ERROR'
      error.getUserMessage = () => 'Custom error'

      const result = await recoveryService.attemptRecovery(error, context)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Custom recovery')
    })

    it('should get integration strategy', () => {
      const strategy = recoveryService.getIntegrationStrategy()

      expect(strategy).toBeInstanceOf(IntegrationRecoveryStrategy)
    })
  })
})
