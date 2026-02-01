# Error Handling and Recovery System

## Overview

The Patient Management System includes a comprehensive error handling and recovery system designed to provide robust error management, automatic retry mechanisms, and graceful degradation strategies. This system ensures system reliability and provides clear, actionable error messages to users.

## Requirements

This error handling system addresses the following requirements:
- **Requirement 4.6**: Integration error handling with fallback mechanisms
- **Requirement 6.6**: Data validation error handling with clear messages

## Architecture

The error handling system consists of three main components:

### 1. Error Classes (`PatientManagementErrors.ts`)

Custom error types that extend the base `PatientManagementError` class, providing:
- Structured error information with error codes
- Context data for debugging
- User-friendly error messages
- JSON serialization for logging

### 2. Error Handler (`ErrorHandler.ts`)

Centralized error handling service that provides:
- Automatic retry mechanisms with exponential backoff
- Fallback strategy execution
- Incident reporting for critical errors
- Security and compliance violation handling
- Comprehensive error logging

### 3. Error Recovery (`ErrorRecovery.ts`)

Recovery strategies and circuit breaker patterns for:
- Database connection failures
- Integration service failures
- Storage errors
- Network errors
- Automatic recovery attempts

## Error Types

### Validation Errors
- `ValidationError`: Field validation failures
- `DataIntegrityError`: Data consistency violations
- `DuplicateRecordError`: Duplicate record detection

### Resource Errors
- `ResourceNotFoundError`: Missing resources
- `ResourceConflictError`: Resource conflicts

### Security Errors
- `AuthorizationError`: Permission violations
- `SecurityViolationError`: Security threats
- `DataEncryptionError`: Encryption failures

### System Errors
- `DatabaseError`: Database operation failures
- `StorageError`: File/cache storage failures
- `NetworkError`: Network communication failures

### Integration Errors
- `IntegrationError`: External system integration failures
- `DataSyncError`: Data synchronization failures

### Compliance Errors
- `LGPDComplianceError`: LGPD regulation violations
- `ConsentError`: Patient consent issues

### Document Errors
- `DocumentValidationError`: Document validation failures
- `VirusScanError`: Security scan failures

### Business Logic Errors
- `BusinessRuleViolationError`: Business rule violations
- `StatusTransitionError`: Invalid status transitions

## Usage Examples

### Basic Error Handling

```typescript
import { globalErrorHandler, ErrorContext } from '../infrastructure/errors'

const context: ErrorContext = {
  userId: 'user-123',
  operation: 'createPatient',
  timestamp: new Date()
}

try {
  // Your operation
  await patientRegistry.createPatient(data, userId)
} catch (error) {
  const result = await globalErrorHandler.handleError(error, context)
  console.log(result.userMessage) // User-friendly message
  console.log(result.recoveryAction) // Suggested action
}
```

### Automatic Retry

```typescript
import { ErrorHandler } from '../infrastructure/errors'

const errorHandler = new ErrorHandler({
  enableRetry: true,
  maxRetries: 3,
  exponentialBackoff: true
})

const result = await errorHandler.executeWithRetry(
  async () => {
    return await someOperation()
  },
  context
)
```

### Fallback Strategies

```typescript
const result = await errorHandler.executeWithFallback(
  [
    async () => await primaryOperation(),
    async () => await fallbackOperation(),
    async () => await lastResortOperation()
  ],
  context
)
```

### Error Recovery

```typescript
import { ErrorRecoveryService } from '../infrastructure/errors'

const recoveryService = new ErrorRecoveryService(errorHandler)

const result = await recoveryService.executeWithRecovery(
  async () => await operation(),
  context,
  3 // max recovery attempts
)
```

### Circuit Breaker for Integrations

```typescript
const integrationStrategy = recoveryService.getIntegrationStrategy()

const result = await integrationStrategy.executeWithCircuitBreaker(
  'AppointmentSystem',
  async () => await integrationCall(),
  async () => await fallbackData() // Used when circuit is open
)
```

### Validation Error Handling

```typescript
try {
  await patientRegistry.createPatient(invalidData, userId)
} catch (error) {
  if (error instanceof ValidationError) {
    error.validationErrors.forEach(err => {
      console.log(`${err.field}: ${err.message}`)
    })
  }
}
```

### Using Error Factory

```typescript
import { ErrorFactory } from '../infrastructure/errors'

// Create validation error
const error = ErrorFactory.createValidationError(
  [
    { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' }
  ],
  { userId: 'user-123' }
)

// Create not found error
const notFound = ErrorFactory.createNotFoundError(
  'Patient',
  'patient-123'
)

// Create authorization error
const authError = ErrorFactory.createAuthorizationError(
  'user-123',
  'Patient',
  'delete'
)
```

## Configuration

### Error Handler Configuration

```typescript
const errorHandler = new ErrorHandler({
  enableRetry: true,           // Enable automatic retry
  maxRetries: 3,               // Maximum retry attempts
  retryDelay: 1000,            // Initial retry delay (ms)
  exponentialBackoff: true,    // Use exponential backoff
  enableLogging: true,         // Enable error logging
  enableIncidentReporting: true, // Create incident reports
  enableUserNotification: true  // Enable user notifications
})
```

### Retry Configuration

```typescript
const retryConfig = {
  maxAttempts: 3,              // Maximum retry attempts
  initialDelay: 1000,          // Initial delay (ms)
  maxDelay: 10000,             // Maximum delay (ms)
  exponentialBackoff: true,    // Use exponential backoff
  retryableErrors: [           // Error codes that can be retried
    'DATABASE_ERROR',
    'NETWORK_ERROR',
    'STORAGE_ERROR',
    'INTEGRATION_ERROR'
  ]
}
```

### Circuit Breaker Configuration

```typescript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,         // Failures before opening circuit
  resetTimeout: 60000,         // Time before attempting reset (ms)
  monitoringPeriod: 300000     // Monitoring period (ms)
})
```

## Error Handling Best Practices

### 1. Always Provide Context

```typescript
const context: ErrorContext = {
  userId: currentUser.id,
  patientId: patient.id,
  operation: 'updatePatient',
  timestamp: new Date(),
  metadata: {
    source: 'web-app',
    ipAddress: request.ip
  }
}
```

### 2. Use Specific Error Types

```typescript
// Good
throw new ValidationError('Validation failed', validationErrors)

// Avoid
throw new Error('Something went wrong')
```

### 3. Handle Errors at Appropriate Levels

- **Service Layer**: Business logic errors, validation errors
- **Repository Layer**: Database errors, storage errors
- **Integration Layer**: Integration errors, network errors
- **API Layer**: Convert to HTTP responses

### 4. Provide User-Friendly Messages

```typescript
class CustomError extends PatientManagementError {
  getUserMessage(): string {
    return 'A clear, actionable message for the user'
  }
}
```

### 5. Log Errors Appropriately

```typescript
// Critical errors
console.error('CRITICAL ERROR', error.toJSON())

// Warnings
console.warn('Warning', error.toJSON())

// Info
console.info('Operation failed, retrying...', error.toJSON())
```

## Recovery Strategies

### Database Recovery
- Connection errors: Automatic retry
- Constraint violations: User correction required
- Deadlocks: Automatic retry

### Integration Recovery
- Service unavailable: Circuit breaker + fallback
- Timeout: Retry with longer timeout
- Rate limiting: Wait and retry

### Storage Recovery
- File storage errors: User retry
- Cache errors: Fallback to database

### Network Recovery
- Timeout: Retry with longer timeout
- Connection errors: User notification
- Server errors (5xx): Automatic retry

## Incident Reporting

Critical errors automatically create incident reports:

```typescript
const incidents = errorHandler.getIncidentReports()

incidents.forEach(incident => {
  console.log({
    id: incident.id,
    severity: incident.severity,
    timestamp: incident.timestamp,
    resolved: incident.resolved
  })
})

// Resolve an incident
errorHandler.resolveIncident(incidentId, 'Fixed by restarting service')
```

## Testing Error Handling

```typescript
// Test validation errors
test('should handle validation errors', async () => {
  const error = new ValidationError('Validation failed', [
    { field: 'email', message: 'Invalid', code: 'INVALID_EMAIL' }
  ])
  
  const result = await errorHandler.handleError(error, context)
  expect(result.success).toBe(false)
  expect(result.userMessage).toContain('Invalid')
})

// Test retry mechanism
test('should retry on database errors', async () => {
  let attempts = 0
  
  const result = await errorHandler.executeWithRetry(
    async () => {
      attempts++
      if (attempts < 3) {
        throw new DatabaseError('Connection failed', 'query')
      }
      return 'success'
    },
    context
  )
  
  expect(attempts).toBe(3)
  expect(result).toBe('success')
})

// Test circuit breaker
test('should open circuit after threshold', async () => {
  const circuitBreaker = new CircuitBreaker({ failureThreshold: 3 })
  
  // Cause failures
  for (let i = 0; i < 3; i++) {
    try {
      await circuitBreaker.execute(async () => {
        throw new Error('Service unavailable')
      })
    } catch (error) {
      // Expected
    }
  }
  
  expect(circuitBreaker.getState().state).toBe('open')
})
```

## Integration with Services

All service classes should use the error handling system:

```typescript
export class PatientRegistry {
  private errorHandler: ErrorHandler
  private recoveryService: ErrorRecoveryService

  constructor(
    private patientRepository: IPatientRepository,
    errorHandler?: ErrorHandler
  ) {
    this.errorHandler = errorHandler || globalErrorHandler
    this.recoveryService = new ErrorRecoveryService(this.errorHandler)
  }

  async createPatient(request: CreatePatientRequest, userId: string): Promise<Patient> {
    const context: ErrorContext = {
      userId,
      operation: 'createPatient',
      timestamp: new Date()
    }

    return await this.recoveryService.executeWithRecovery(
      async () => {
        // Validation
        this.validateRequest(request)
        
        // Business logic
        return await this.patientRepository.create(data, userId)
      },
      context,
      3
    )
  }
}
```

## Monitoring and Alerting

The error handling system provides hooks for monitoring:

```typescript
// Monitor error rates
const incidents = errorHandler.getIncidentReports()
const criticalIncidents = incidents.filter(i => i.severity === 'critical')

// Alert on high error rates
if (criticalIncidents.length > 10) {
  await notifyAdministrators('High critical error rate detected')
}

// Monitor circuit breaker states
const integrationStrategy = recoveryService.getIntegrationStrategy()
// Check circuit states for all integrations
```

## See Also

- [Error Handling Usage Examples](../../examples/error-handling-usage.ts)
- [Patient Registry Service](../../application/services/PatientRegistry.ts)
- [Integration Hub](../integration/IntegrationHub.ts)
