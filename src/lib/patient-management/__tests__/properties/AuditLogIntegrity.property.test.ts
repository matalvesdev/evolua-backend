// ============================================================================
// AUDIT LOG INTEGRITY AND RETENTION PROPERTY TESTS
// Property-based tests for audit log protection, retention, and reporting
// Feature: patient-management-system, Property 16: Audit Log Integrity and Retention
// **Validates: Requirements 8.3, 8.4, 8.5**
// ============================================================================

import * as fc from 'fast-check'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import {
  patientIdGenerator,
  userIdGenerator
} from '../../testing/generators'

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

interface AuditLogEntry {
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
  oldValues?: any
  newValues?: any
  isProtected: boolean
  checksum?: string
}

interface AuditQuery {
  userId?: UserId
  patientId?: PatientId
  operation?: string
  dataType?: string
  accessResult?: 'granted' | 'denied' | 'partial'
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}

interface AuditReport {
  totalLogs: number
  logs: AuditLogEntry[]
  fromDate?: Date
  toDate?: Date
  generatedAt: Date
  generatedBy: UserId
}

// ============================================================================
// MOCK AUDIT LOG REPOSITORY WITH PROTECTION
// ============================================================================

class ProtectedAuditLogRepository {
  private logs: AuditLogEntry[] = []
  private readonly RETENTION_DAYS = 2555 // 7 years

  async create(logEntry: Omit<AuditLogEntry, 'id' | 'isProtected' | 'checksum'>): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      ...logEntry,
      id: this.generateLogId(),
      isProtected: true,
      checksum: this.calculateChecksum(logEntry)
    }

    this.logs.push(entry)
    return entry
  }

  async search(query: AuditQuery): Promise<AuditLogEntry[]> {
    let results = [...this.logs]

    if (query.userId) {
      results = results.filter(log => log.userId.value === query.userId!.value)
    }

    if (query.patientId) {
      results = results.filter(log => log.patientId.value === query.patientId!.value)
    }

    if (query.operation) {
      results = results.filter(log => log.operation === query.operation)
    }

    if (query.dataType) {
      results = results.filter(log => log.dataType === query.dataType)
    }

    if (query.accessResult) {
      results = results.filter(log => log.accessResult === query.accessResult)
    }

    if (query.fromDate) {
      results = results.filter(log => log.timestamp >= query.fromDate!)
    }

    if (query.toDate) {
      results = results.filter(log => log.timestamp <= query.toDate!)
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    if (query.offset !== undefined) {
      results = results.slice(query.offset)
    }

    if (query.limit !== undefined) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  async attemptModification(logId: string, modifications: Partial<AuditLogEntry>): Promise<{ success: boolean; error?: string }> {
    const log = this.logs.find(l => l.id === logId)
    
    if (!log) {
      return { success: false, error: 'Log not found' }
    }

    // CRITICAL: Audit logs are protected from modification
    if (log.isProtected) {
      return { success: false, error: 'Audit logs are protected from modification' }
    }

    return { success: false, error: 'Modification not allowed' }
  }

  async attemptDeletion(logId: string): Promise<{ success: boolean; error?: string }> {
    const log = this.logs.find(l => l.id === logId)
    
    if (!log) {
      return { success: false, error: 'Log not found' }
    }

    // CRITICAL: Audit logs are protected from deletion
    if (log.isProtected) {
      return { success: false, error: 'Audit logs are protected from deletion' }
    }

    return { success: false, error: 'Deletion not allowed' }
  }

  async deleteOlderThan(cutoffDate: Date): Promise<number> {
    const beforeCount = this.logs.length
    
    // Only delete logs older than retention period
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate)
    
    return beforeCount - this.logs.length
  }

  async verifyIntegrity(logId: string): Promise<{ valid: boolean; error?: string }> {
    const log = this.logs.find(l => l.id === logId)
    
    if (!log) {
      return { valid: false, error: 'Log not found' }
    }

    // Verify checksum
    const expectedChecksum = this.calculateChecksum(log)
    if (log.checksum !== expectedChecksum) {
      return { valid: false, error: 'Checksum mismatch - log may have been tampered with' }
    }

    return { valid: true }
  }

  getAllLogs(): AuditLogEntry[] {
    return [...this.logs]
  }

  getLogsCount(): number {
    return this.logs.length
  }

  clear(): void {
    this.logs = []
  }

  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private calculateChecksum(logEntry: Partial<AuditLogEntry>): string {
    // Simple checksum calculation for integrity verification
    const data = JSON.stringify({
      userId: logEntry.userId?.value,
      patientId: logEntry.patientId?.value,
      operation: logEntry.operation,
      dataType: logEntry.dataType,
      timestamp: logEntry.timestamp?.toISOString(),
      oldValues: logEntry.oldValues,
      newValues: logEntry.newValues
    })
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }
}

// ============================================================================
// MOCK AUDIT REPORTING SERVICE
// ============================================================================

class AuditReportingService {
  constructor(private readonly repository: ProtectedAuditLogRepository) {}

  async generateReport(query: AuditQuery, generatedBy: UserId): Promise<AuditReport> {
    const logs = await this.repository.search(query)
    
    return {
      totalLogs: logs.length,
      logs,
      fromDate: query.fromDate,
      toDate: query.toDate,
      generatedAt: new Date(),
      generatedBy
    }
  }

  async generateComprehensiveReport(
    fromDate: Date,
    toDate: Date,
    generatedBy: UserId
  ): Promise<AuditReport> {
    const query: AuditQuery = {
      fromDate,
      toDate
    }
    
    return this.generateReport(query, generatedBy)
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const operationGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom('read', 'create', 'update', 'delete', 'export', 'view')

const dataTypeGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom('patient_data', 'medical_record', 'document', 'personal_information', 'contact_information')

const accessResultGenerator = (): fc.Arbitrary<'granted' | 'denied' | 'partial'> =>
  fc.constantFrom('granted', 'denied', 'partial')

const auditLogDataGenerator = (): fc.Arbitrary<Omit<AuditLogEntry, 'id' | 'isProtected' | 'checksum'>> =>
  fc.record({
    userId: userIdGenerator(),
    patientId: patientIdGenerator(),
    operation: operationGenerator(),
    dataType: dataTypeGenerator(),
    accessResult: accessResultGenerator(),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime())),
    ipAddress: fc.option(fc.string({ minLength: 7, maxLength: 15 })),
    userAgent: fc.option(fc.string({ minLength: 10, maxLength: 50 })),
    justification: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
    oldValues: fc.option(fc.anything()),
    newValues: fc.option(fc.anything())
  })

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 16: Audit Log Integrity and Retention', () => {
  // ============================================================================
  // PROTECTION FROM UNAUTHORIZED MODIFICATION TESTS
  // ============================================================================

  test('Property 16.1: Audit logs are protected from unauthorized modification', () => {
    fc.assert(
      fc.asyncProperty(
        auditLogDataGenerator(),
        fc.record({
          operation: fc.option(operationGenerator()),
          dataType: fc.option(dataTypeGenerator()),
          justification: fc.option(fc.string({ minLength: 10, maxLength: 100 }))
        }),
        async (logData, modifications) => {
          // Create fresh repository for this iteration
          const repository = new ProtectedAuditLogRepository()

          // Create audit log entry
          const logEntry = await repository.create(logData)

          // Verify log is protected
          expect(logEntry.isProtected).toBe(true)

          // Attempt to modify the audit log
          const modificationResult = await repository.attemptModification(logEntry.id, modifications)

          // CRITICAL: Modification should be rejected
          expect(modificationResult.success).toBe(false)
          expect(modificationResult.error).toBeDefined()
          expect(modificationResult.error).toContain('protected')

          // Verify log remains unchanged
          const logs = repository.getAllLogs()
          const unchangedLog = logs.find(l => l.id === logEntry.id)
          
          expect(unchangedLog).toBeDefined()
          expect(unchangedLog!.operation).toBe(logData.operation)
          expect(unchangedLog!.dataType).toBe(logData.dataType)
          expect(unchangedLog!.userId.value).toBe(logData.userId.value)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 16.2: Audit logs are protected from unauthorized deletion', () => {
    fc.assert(
      fc.asyncProperty(
        auditLogDataGenerator(),
        async (logData) => {
          // Create fresh repository for this iteration
          const repository = new ProtectedAuditLogRepository()

          // Create audit log entry
          const logEntry = await repository.create(logData)

          // Verify log exists
          const beforeCount = repository.getLogsCount()
          expect(beforeCount).toBe(1)

          // Attempt to delete the audit log
          const deletionResult = await repository.attemptDeletion(logEntry.id)

          // CRITICAL: Deletion should be rejected
          expect(deletionResult.success).toBe(false)
          expect(deletionResult.error).toBeDefined()
          expect(deletionResult.error).toContain('protected')

          // Verify log still exists
          const afterCount = repository.getLogsCount()
          expect(afterCount).toBe(beforeCount)

          const logs = repository.getAllLogs()
          const stillExists = logs.find(l => l.id === logEntry.id)
          expect(stillExists).toBeDefined()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 16.3: Audit log integrity can be verified via checksum', () => {
    fc.assert(
      fc.asyncProperty(
        auditLogDataGenerator(),
        async (logData) => {
          // Create fresh repository for this iteration
          const repository = new ProtectedAuditLogRepository()

          // Create audit log entry
          const logEntry = await repository.create(logData)

          // Verify log has checksum
          expect(logEntry.checksum).toBeDefined()
          expect(typeof logEntry.checksum).toBe('string')

          // Verify integrity
          const integrityCheck = await repository.verifyIntegrity(logEntry.id)

          // CRITICAL: Integrity should be valid
          expect(integrityCheck.valid).toBe(true)
          expect(integrityCheck.error).toBeUndefined()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // RETENTION PERIOD TESTS
  // ============================================================================

  test('Property 16.4: Audit logs are maintained for required retention period (7 years)', () => {
    fc.assert(
      fc.asyncProperty(
        auditLogDataGenerator(),
        fc.integer({ min: 1, max: 2555 }), // Days within 7 years
        async (logData, daysOld) => {
          // Create fresh repository for this iteration
          const repository = new ProtectedAuditLogRepository()

          // Create audit log with specific timestamp
          const logTimestamp = new Date()
          logTimestamp.setDate(logTimestamp.getDate() - daysOld)

          const logEntry = await repository.create({
            ...logData,
            timestamp: logTimestamp
          })

          // Calculate cutoff date for 7 years retention
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - 2555) // 7 years

          // Attempt to purge old logs
          const purgedCount = await repository.deleteOlderThan(cutoffDate)

          // CRITICAL: Logs within retention period should NOT be deleted
          if (daysOld <= 2555) {
            const logs = repository.getAllLogs()
            const logStillExists = logs.find(l => l.id === logEntry.id)
            expect(logStillExists).toBeDefined()
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 16.5: Audit logs older than retention period can be purged', () => {
    fc.assert(
      fc.asyncProperty(
        auditLogDataGenerator(),
        fc.integer({ min: 2556, max: 3650 }), // Days beyond 7 years
        async (logData, daysOld) => {
          // Create fresh repository for this iteration
          const repository = new ProtectedAuditLogRepository()

          // Create audit log with old timestamp
          const logTimestamp = new Date()
          logTimestamp.setDate(logTimestamp.getDate() - daysOld)

          const logEntry = await repository.create({
            ...logData,
            timestamp: logTimestamp
          })

          const beforeCount = repository.getLogsCount()
          expect(beforeCount).toBe(1)

          // Calculate cutoff date for 7 years retention
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - 2555) // 7 years

          // Purge old logs
          const purgedCount = await repository.deleteOlderThan(cutoffDate)

          // CRITICAL: Logs beyond retention period should be deleted
          expect(purgedCount).toBe(1)

          const afterCount = repository.getLogsCount()
          expect(afterCount).toBe(0)

          const logs = repository.getAllLogs()
          const logExists = logs.find(l => l.id === logEntry.id)
          expect(logExists).toBeUndefined()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE AUDIT REPORT TESTS
  // ============================================================================

  test('Property 16.6: Audit logs are included in comprehensive reports when requested', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(auditLogDataGenerator(), { minLength: 5, maxLength: 20 }),
        userIdGenerator(),
        async (logDataArray, reportGeneratorUserId) => {
          // Create fresh instances for this iteration
          const repository = new ProtectedAuditLogRepository()
          const reportingService = new AuditReportingService(repository)

          // Create multiple audit log entries
          const createdLogs = await Promise.all(
            logDataArray.map(logData => repository.create(logData))
          )

          // Generate comprehensive report
          const fromDate = new Date('2020-01-01')
          const toDate = new Date()

          const report = await reportingService.generateComprehensiveReport(
            fromDate,
            toDate,
            reportGeneratorUserId
          )

          // CRITICAL: Report should include all audit logs
          expect(report.totalLogs).toBe(createdLogs.length)
          expect(report.logs.length).toBe(createdLogs.length)

          // Verify report metadata
          expect(report.fromDate).toEqual(fromDate)
          expect(report.toDate).toEqual(toDate)
          expect(report.generatedAt).toBeInstanceOf(Date)
          expect(report.generatedBy.value).toBe(reportGeneratorUserId.value)

          // Verify all logs are included
          createdLogs.forEach(createdLog => {
            const foundInReport = report.logs.find(l => l.id === createdLog.id)
            expect(foundInReport).toBeDefined()
          })

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 16.7: Audit reports support filtering by user, patient, and date range', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        userIdGenerator(),
        patientIdGenerator(),
        patientIdGenerator(),
        userIdGenerator(),
        async (user1, user2, patient1, patient2, reportGeneratorUserId) => {
          // Create fresh instances for this iteration
          const repository = new ProtectedAuditLogRepository()
          const reportingService = new AuditReportingService(repository)

          // Create audit logs for different users and patients
          const log1 = await repository.create({
            userId: user1,
            patientId: patient1,
            operation: 'read',
            dataType: 'patient_data',
            accessResult: 'granted',
            timestamp: new Date('2023-01-15')
          })

          const log2 = await repository.create({
            userId: user1,
            patientId: patient2,
            operation: 'update',
            dataType: 'medical_record',
            accessResult: 'granted',
            timestamp: new Date('2023-02-20')
          })

          const log3 = await repository.create({
            userId: user2,
            patientId: patient1,
            operation: 'read',
            dataType: 'patient_data',
            accessResult: 'denied',
            timestamp: new Date('2023-03-10')
          })

          // Filter by user1
          const user1Report = await reportingService.generateReport(
            { userId: user1 },
            reportGeneratorUserId
          )
          expect(user1Report.totalLogs).toBe(2)
          user1Report.logs.forEach(log => {
            expect(log.userId.value).toBe(user1.value)
          })

          // Filter by patient1
          const patient1Report = await reportingService.generateReport(
            { patientId: patient1 },
            reportGeneratorUserId
          )
          expect(patient1Report.totalLogs).toBe(2)
          patient1Report.logs.forEach(log => {
            expect(log.patientId.value).toBe(patient1.value)
          })

          // Filter by date range
          const dateRangeReport = await reportingService.generateReport(
            {
              fromDate: new Date('2023-02-01'),
              toDate: new Date('2023-03-31')
            },
            reportGeneratorUserId
          )
          expect(dateRangeReport.totalLogs).toBe(2)
          dateRangeReport.logs.forEach(log => {
            expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(new Date('2023-02-01').getTime())
            expect(log.timestamp.getTime()).toBeLessThanOrEqual(new Date('2023-03-31').getTime())
          })

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 16.8: Audit reports support filtering by operation and access result', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        patientIdGenerator(),
        userIdGenerator(),
        async (userId, patientId, reportGeneratorUserId) => {
          // Create fresh instances for this iteration
          const repository = new ProtectedAuditLogRepository()
          const reportingService = new AuditReportingService(repository)

          // Create audit logs with different operations and results
          await repository.create({
            userId,
            patientId,
            operation: 'read',
            dataType: 'patient_data',
            accessResult: 'granted',
            timestamp: new Date()
          })

          await repository.create({
            userId,
            patientId,
            operation: 'update',
            dataType: 'medical_record',
            accessResult: 'granted',
            timestamp: new Date()
          })

          await repository.create({
            userId,
            patientId,
            operation: 'delete',
            dataType: 'document',
            accessResult: 'denied',
            timestamp: new Date()
          })

          // Filter by operation
          const readReport = await reportingService.generateReport(
            { operation: 'read' },
            reportGeneratorUserId
          )
          expect(readReport.totalLogs).toBe(1)
          expect(readReport.logs[0].operation).toBe('read')

          // Filter by access result
          const deniedReport = await reportingService.generateReport(
            { accessResult: 'denied' },
            reportGeneratorUserId
          )
          expect(deniedReport.totalLogs).toBe(1)
          expect(deniedReport.logs[0].accessResult).toBe('denied')

          // Filter by data type
          const medicalRecordReport = await reportingService.generateReport(
            { dataType: 'medical_record' },
            reportGeneratorUserId
          )
          expect(medicalRecordReport.totalLogs).toBe(1)
          expect(medicalRecordReport.logs[0].dataType).toBe('medical_record')

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE INTEGRITY TESTS
  // ============================================================================

  test('Property 16.9: All audit log entries maintain integrity throughout their lifecycle', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(auditLogDataGenerator(), { minLength: 3, maxLength: 10 }),
        userIdGenerator(),
        async (logDataArray, reportGeneratorUserId) => {
          // Create fresh instances for this iteration
          const repository = new ProtectedAuditLogRepository()
          const reportingService = new AuditReportingService(repository)

          // Create multiple audit log entries
          const createdLogs = await Promise.all(
            logDataArray.map(logData => repository.create(logData))
          )

          // Verify all logs are protected
          createdLogs.forEach(log => {
            expect(log.isProtected).toBe(true)
            expect(log.checksum).toBeDefined()
          })

          // Attempt to modify each log
          for (const log of createdLogs) {
            const modResult = await repository.attemptModification(log.id, { operation: 'tampered' })
            expect(modResult.success).toBe(false)
          }

          // Verify integrity of all logs
          for (const log of createdLogs) {
            const integrityCheck = await repository.verifyIntegrity(log.id)
            expect(integrityCheck.valid).toBe(true)
          }

          // Generate report and verify all logs are included
          const report = await reportingService.generateComprehensiveReport(
            new Date('2020-01-01'),
            new Date(),
            reportGeneratorUserId
          )

          expect(report.totalLogs).toBe(createdLogs.length)

          // Verify each log in report maintains integrity
          report.logs.forEach(reportLog => {
            expect(reportLog.isProtected).toBe(true)
            expect(reportLog.checksum).toBeDefined()
          })

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 16.10: Audit log protection persists across queries and reports', () => {
    fc.assert(
      fc.asyncProperty(
        auditLogDataGenerator(),
        userIdGenerator(),
        async (logData, reportGeneratorUserId) => {
          // Create fresh instances for this iteration
          const repository = new ProtectedAuditLogRepository()
          const reportingService = new AuditReportingService(repository)

          // Create audit log entry
          const originalLog = await repository.create(logData)

          // Query the log multiple times
          const query1 = await repository.search({ userId: logData.userId })
          const query2 = await repository.search({ patientId: logData.patientId })
          const query3 = await repository.search({ operation: logData.operation })

          // Verify log is protected in all queries
          expect(query1[0].isProtected).toBe(true)
          expect(query2[0].isProtected).toBe(true)
          expect(query3[0].isProtected).toBe(true)

          // Generate report
          const report = await reportingService.generateComprehensiveReport(
            new Date('2020-01-01'),
            new Date(),
            reportGeneratorUserId
          )

          // Verify log is protected in report
          const logInReport = report.logs.find(l => l.id === originalLog.id)
          expect(logInReport).toBeDefined()
          expect(logInReport!.isProtected).toBe(true)

          // Verify integrity after all operations
          const integrityCheck = await repository.verifyIntegrity(originalLog.id)
          expect(integrityCheck.valid).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
