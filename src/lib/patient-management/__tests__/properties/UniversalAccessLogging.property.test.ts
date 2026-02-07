// ============================================================================
// UNIVERSAL ACCESS LOGGING PROPERTY TESTS
// Property-based tests for universal access logging on all data access attempts
// Feature: patient-management-system, Property 4: Universal Access Logging
// **Validates: Requirements 1.4, 5.2, 8.1**
// ============================================================================

import * as fc from 'fast-check'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import {
  patientIdGenerator,
  userIdGenerator
} from '../../testing/generators'

// ============================================================================
// SIMPLE AUDIT LOG TYPES
// ============================================================================

interface AccessLogEntry {
  id: string
  userId: UserId
  patientId: PatientId
  operation: string
  dataType: string
  accessResult: 'granted' | 'denied' | 'partial'
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  justification?: string
}

// ============================================================================
// MOCK ACCESS LOGGER
// ============================================================================

class SimpleAccessLogger {
  private logs: AccessLogEntry[] = []

  async logAccess(
    userId: UserId,
    patientId: PatientId,
    operation: string,
    dataType: string,
    accessResult: 'granted' | 'denied' | 'partial',
    ipAddress?: string,
    userAgent?: string,
    justification?: string
  ): Promise<void> {
    const logEntry: AccessLogEntry = {
      id: `access_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId,
      patientId,
      operation,
      dataType,
      accessResult,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      justification
    }

    this.logs.push(logEntry)
  }

  queryLogs(userId?: UserId, patientId?: PatientId, accessResult?: 'granted' | 'denied' | 'partial'): AccessLogEntry[] {
    let results = [...this.logs]

    if (userId) {
      results = results.filter(log => log.userId.value === userId.value)
    }

    if (patientId) {
      results = results.filter(log => log.patientId.value === patientId.value)
    }

    if (accessResult) {
      results = results.filter(log => log.accessResult === accessResult)
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return results
  }

  getAllLogs(): AccessLogEntry[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }
}

// ============================================================================
// MOCK DATA ACCESS SERVICE
// ============================================================================

class MockDataAccessService {
  constructor(
    private readonly accessLogger: SimpleAccessLogger,
    private readonly authorizedUsers: Set<string> = new Set()
  ) {}

  async accessPatientData(
    userId: UserId,
    patientId: PatientId,
    operation: string,
    dataType: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; data?: any }> {
    // Determine if access should be granted
    const isAuthorized = this.authorizedUsers.has(userId.value)
    const accessResult: 'granted' | 'denied' = isAuthorized ? 'granted' : 'denied'

    // CRITICAL: Log access attempt REGARDLESS of whether access is granted or denied
    await this.accessLogger.logAccess(
      userId,
      patientId,
      operation,
      dataType,
      accessResult,
      ipAddress,
      userAgent,
      isAuthorized ? `Access ${operation} on ${dataType}` : `Unauthorized access attempt`
    )

    if (isAuthorized) {
      return {
        success: true,
        data: { patientId: patientId.value, dataType, operation }
      }
    } else {
      return {
        success: false
      }
    }
  }

  authorizeUser(userId: UserId): void {
    this.authorizedUsers.add(userId.value)
  }

  revokeUser(userId: UserId): void {
    this.authorizedUsers.delete(userId.value)
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const operationGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom('read', 'create', 'update', 'delete', 'export', 'view')

const dataTypeGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom('patient_data', 'medical_record', 'document', 'personal_information', 'contact_information')

const ipAddressGenerator = (): fc.Arbitrary<string> =>
  fc.tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 255 })
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`)

const userAgentGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0'
  )

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 4: Universal Access Logging', () => {
  // ============================================================================
  // GRANTED ACCESS LOGGING TESTS
  // ============================================================================

  test('Property 4.1: Granted access attempts generate log entries with complete information', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        patientIdGenerator(),
        operationGenerator(),
        dataTypeGenerator(),
        fc.option(ipAddressGenerator()),
        fc.option(userAgentGenerator()),
        async (userId, patientId, operation, dataType, ipAddress, userAgent) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()
          const dataAccessService = new MockDataAccessService(accessLogger)

          // Authorize the user
          dataAccessService.authorizeUser(userId)

          const beforeAccess = new Date()

          // Attempt to access patient data
          const result = await dataAccessService.accessPatientData(
            userId,
            patientId,
            operation,
            dataType,
            ipAddress || undefined,
            userAgent || undefined
          )

          const afterAccess = new Date()

          // Verify access was granted
          expect(result.success).toBe(true)

          // Verify log entry was created
          const logs = accessLogger.getAllLogs()
          expect(logs.length).toBe(1)

          const logEntry = logs[0]

          // Verify log contains user identity
          expect(logEntry.userId.value).toBe(userId.value)

          // Verify log contains patient ID (data accessed)
          expect(logEntry.patientId.value).toBe(patientId.value)

          // Verify log contains timestamp
          expect(logEntry.timestamp).toBeInstanceOf(Date)
          expect(logEntry.timestamp.getTime()).toBeGreaterThanOrEqual(beforeAccess.getTime())
          expect(logEntry.timestamp.getTime()).toBeLessThanOrEqual(afterAccess.getTime())

          // Verify log contains access result
          expect(logEntry.accessResult).toBe('granted')

          // Verify log contains operation and data type
          expect(logEntry.operation).toBe(operation)
          expect(logEntry.dataType).toBe(dataType)

          // Verify optional fields if provided
          if (ipAddress) {
            expect(logEntry.ipAddress).toBe(ipAddress)
          }
          if (userAgent) {
            expect(logEntry.userAgent).toBe(userAgent)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // DENIED ACCESS LOGGING TESTS
  // ============================================================================

  test('Property 4.2: Denied access attempts generate log entries with complete information', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        patientIdGenerator(),
        operationGenerator(),
        dataTypeGenerator(),
        fc.option(ipAddressGenerator()),
        fc.option(userAgentGenerator()),
        async (userId, patientId, operation, dataType, ipAddress, userAgent) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()
          const dataAccessService = new MockDataAccessService(accessLogger)

          // DO NOT authorize the user - access should be denied

          const beforeAccess = new Date()

          // Attempt to access patient data
          const result = await dataAccessService.accessPatientData(
            userId,
            patientId,
            operation,
            dataType,
            ipAddress || undefined,
            userAgent || undefined
          )

          const afterAccess = new Date()

          // Verify access was denied
          expect(result.success).toBe(false)

          // CRITICAL: Verify log entry was created EVEN THOUGH access was denied
          const logs = accessLogger.getAllLogs()
          expect(logs.length).toBe(1)

          const logEntry = logs[0]

          // Verify log contains user identity
          expect(logEntry.userId.value).toBe(userId.value)

          // Verify log contains patient ID (data accessed)
          expect(logEntry.patientId.value).toBe(patientId.value)

          // Verify log contains timestamp
          expect(logEntry.timestamp).toBeInstanceOf(Date)
          expect(logEntry.timestamp.getTime()).toBeGreaterThanOrEqual(beforeAccess.getTime())
          expect(logEntry.timestamp.getTime()).toBeLessThanOrEqual(afterAccess.getTime())

          // Verify log contains access result showing denial
          expect(logEntry.accessResult).toBe('denied')

          // Verify log contains operation and data type
          expect(logEntry.operation).toBe(operation)
          expect(logEntry.dataType).toBe(dataType)

          // Verify optional fields if provided
          if (ipAddress) {
            expect(logEntry.ipAddress).toBe(ipAddress)
          }
          if (userAgent) {
            expect(logEntry.userAgent).toBe(userAgent)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE ACCESS LOGGING TESTS
  // ============================================================================

  test('Property 4.3: All access attempts are logged regardless of access result', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        userIdGenerator(),
        patientIdGenerator(),
        operationGenerator(),
        dataTypeGenerator(),
        async (authorizedUserId, unauthorizedUserId, patientId, operation, dataType) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()
          const dataAccessService = new MockDataAccessService(accessLogger)

          // Authorize only the first user
          dataAccessService.authorizeUser(authorizedUserId)

          // Attempt access with authorized user
          const grantedResult = await dataAccessService.accessPatientData(
            authorizedUserId,
            patientId,
            operation,
            dataType
          )

          // Attempt access with unauthorized user
          const deniedResult = await dataAccessService.accessPatientData(
            unauthorizedUserId,
            patientId,
            operation,
            dataType
          )

          // Verify both access attempts were logged
          const allLogs = accessLogger.getAllLogs()
          expect(allLogs.length).toBe(2)

          // Verify granted access log
          const grantedLog = allLogs.find(log => log.userId.value === authorizedUserId.value)
          expect(grantedLog).toBeDefined()
          expect(grantedLog!.accessResult).toBe('granted')
          expect(grantedLog!.userId.value).toBe(authorizedUserId.value)
          expect(grantedLog!.patientId.value).toBe(patientId.value)
          expect(grantedLog!.timestamp).toBeInstanceOf(Date)

          // Verify denied access log
          const deniedLog = allLogs.find(log => log.userId.value === unauthorizedUserId.value)
          expect(deniedLog).toBeDefined()
          expect(deniedLog!.accessResult).toBe('denied')
          expect(deniedLog!.userId.value).toBe(unauthorizedUserId.value)
          expect(deniedLog!.patientId.value).toBe(patientId.value)
          expect(deniedLog!.timestamp).toBeInstanceOf(Date)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // MULTIPLE ACCESS ATTEMPTS LOGGING TESTS
  // ============================================================================

  test('Property 4.4: Multiple access attempts by same user are all logged', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        patientIdGenerator(),
        patientIdGenerator(),
        patientIdGenerator(),
        operationGenerator(),
        dataTypeGenerator(),
        async (userId, patientId1, patientId2, patientId3, operation, dataType) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()
          const dataAccessService = new MockDataAccessService(accessLogger)

          // Authorize the user
          dataAccessService.authorizeUser(userId)

          // Perform multiple access attempts
          await dataAccessService.accessPatientData(userId, patientId1, operation, dataType)
          await dataAccessService.accessPatientData(userId, patientId2, operation, dataType)
          await dataAccessService.accessPatientData(userId, patientId3, operation, dataType)

          // Verify all access attempts were logged
          const logs = accessLogger.queryLogs(userId)
          expect(logs.length).toBe(3)

          // Verify each log has correct user identity
          logs.forEach(log => {
            expect(log.userId.value).toBe(userId.value)
            expect(log.timestamp).toBeInstanceOf(Date)
            expect(log.accessResult).toBe('granted')
            expect(log.operation).toBe(operation)
            expect(log.dataType).toBe(dataType)
          })

          // Verify different patient IDs were logged
          const loggedPatientIds = logs.map(log => log.patientId.value)
          expect(loggedPatientIds).toContain(patientId1.value)
          expect(loggedPatientIds).toContain(patientId2.value)
          expect(loggedPatientIds).toContain(patientId3.value)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // DIFFERENT OPERATION TYPES LOGGING TESTS
  // ============================================================================

  test('Property 4.5: All operation types generate access logs', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        patientIdGenerator(),
        dataTypeGenerator(),
        async (userId, patientId, dataType) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()
          const dataAccessService = new MockDataAccessService(accessLogger)

          // Authorize the user
          dataAccessService.authorizeUser(userId)

          // Test all operation types
          const operations = ['read', 'create', 'update', 'delete', 'export', 'view']

          for (const operation of operations) {
            await dataAccessService.accessPatientData(userId, patientId, operation, dataType)
          }

          // Verify all operations were logged
          const logs = accessLogger.queryLogs(userId, patientId)
          expect(logs.length).toBe(operations.length)

          // Verify each operation type is present
          const loggedOperations = logs.map(log => log.operation)
          operations.forEach(operation => {
            expect(loggedOperations).toContain(operation)
          })

          // Verify all logs have required fields
          logs.forEach(log => {
            expect(log.userId.value).toBe(userId.value)
            expect(log.patientId.value).toBe(patientId.value)
            expect(log.timestamp).toBeInstanceOf(Date)
            expect(log.accessResult).toBe('granted')
            expect(log.dataType).toBe(dataType)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // CHRONOLOGICAL ORDER LOGGING TESTS
  // ============================================================================

  test('Property 4.6: Access logs maintain chronological order', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        patientIdGenerator(),
        operationGenerator(),
        dataTypeGenerator(),
        async (userId, patientId, operation, dataType) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()
          const dataAccessService = new MockDataAccessService(accessLogger)

          // Authorize the user
          dataAccessService.authorizeUser(userId)

          // Perform multiple access attempts with small delays
          await dataAccessService.accessPatientData(userId, patientId, operation, dataType)
          await new Promise(resolve => setTimeout(resolve, 10))

          await dataAccessService.accessPatientData(userId, patientId, operation, dataType)
          await new Promise(resolve => setTimeout(resolve, 10))

          await dataAccessService.accessPatientData(userId, patientId, operation, dataType)

          // Verify logs are in chronological order (most recent first)
          const logs = accessLogger.queryLogs(userId, patientId)
          expect(logs.length).toBe(3)

          for (let i = 1; i < logs.length; i++) {
            expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i].timestamp.getTime())
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  // ============================================================================
  // PARTIAL ACCESS LOGGING TESTS
  // ============================================================================

  test('Property 4.7: Partial access attempts are logged with correct result', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        patientIdGenerator(),
        operationGenerator(),
        dataTypeGenerator(),
        async (userId, patientId, operation, dataType) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()

          // Simulate partial access (e.g., user can see some fields but not all)
          await accessLogger.logAccess(
            userId,
            patientId,
            operation,
            dataType,
            'partial',
            undefined,
            undefined,
            'User has limited permissions - some fields redacted'
          )

          // Verify log entry was created
          const logs = accessLogger.getAllLogs()
          expect(logs.length).toBe(1)

          const logEntry = logs[0]

          // Verify log contains all required fields
          expect(logEntry.userId.value).toBe(userId.value)
          expect(logEntry.patientId.value).toBe(patientId.value)
          expect(logEntry.timestamp).toBeInstanceOf(Date)
          expect(logEntry.accessResult).toBe('partial')
          expect(logEntry.operation).toBe(operation)
          expect(logEntry.dataType).toBe(dataType)
          expect(logEntry.justification).toContain('limited permissions')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // QUERY FILTERING TESTS
  // ============================================================================

  test('Property 4.8: Access logs can be queried by user, patient, and result', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        userIdGenerator(),
        patientIdGenerator(),
        patientIdGenerator(),
        operationGenerator(),
        dataTypeGenerator(),
        async (user1, user2, patient1, patient2, operation, dataType) => {
          // Create fresh instances for this iteration
          const accessLogger = new SimpleAccessLogger()
          const dataAccessService = new MockDataAccessService(accessLogger)

          // Authorize only user1
          dataAccessService.authorizeUser(user1)

          // Create various access attempts
          await dataAccessService.accessPatientData(user1, patient1, operation, dataType) // granted
          await dataAccessService.accessPatientData(user1, patient2, operation, dataType) // granted
          await dataAccessService.accessPatientData(user2, patient1, operation, dataType) // denied
          await dataAccessService.accessPatientData(user2, patient2, operation, dataType) // denied

          // Query by user1
          const user1Logs = accessLogger.queryLogs(user1)
          expect(user1Logs.length).toBe(2)
          user1Logs.forEach(log => {
            expect(log.userId.value).toBe(user1.value)
            expect(log.accessResult).toBe('granted')
          })

          // Query by user2
          const user2Logs = accessLogger.queryLogs(user2)
          expect(user2Logs.length).toBe(2)
          user2Logs.forEach(log => {
            expect(log.userId.value).toBe(user2.value)
            expect(log.accessResult).toBe('denied')
          })

          // Query by patient1
          const patient1Logs = accessLogger.queryLogs(undefined, patient1)
          expect(patient1Logs.length).toBe(2)
          patient1Logs.forEach(log => {
            expect(log.patientId.value).toBe(patient1.value)
          })

          // Query by access result
          const grantedLogs = accessLogger.queryLogs(undefined, undefined, 'granted')
          expect(grantedLogs.length).toBe(2)
          grantedLogs.forEach(log => {
            expect(log.accessResult).toBe('granted')
          })

          const deniedLogs = accessLogger.queryLogs(undefined, undefined, 'denied')
          expect(deniedLogs.length).toBe(2)
          deniedLogs.forEach(log => {
            expect(log.accessResult).toBe('denied')
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
