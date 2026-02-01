// ============================================================================
// AUDIT LOGGER TESTS
// Comprehensive tests for audit logging functionality
// ============================================================================

import { AuditLogger, AuditLogEntry, AuditQuery, IAuditRepository, IEncryptionService } from '../../../infrastructure/services/AuditLogger'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { UserId } from '../../../domain/value-objects/UserId'

// Mock implementations
class MockAuditRepository implements IAuditRepository {
  private logs: AuditLogEntry[] = []

  async create(logEntry: AuditLogEntry): Promise<void> {
    this.logs.push({ ...logEntry })
  }

  async search(query: AuditQuery): Promise<AuditLogEntry[]> {
    let filteredLogs = [...this.logs]

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId)
    }

    if (query.patientId) {
      filteredLogs = filteredLogs.filter(log => log.patientId === query.patientId)
    }

    if (query.operation) {
      filteredLogs = filteredLogs.filter(log => log.operation === query.operation)
    }

    if (query.dataType) {
      filteredLogs = filteredLogs.filter(log => log.dataType === query.dataType)
    }

    if (query.accessResult) {
      filteredLogs = filteredLogs.filter(log => log.accessResult === query.accessResult)
    }

    if (query.fromDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.fromDate!)
    }

    if (query.toDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.toDate!)
    }

    // Apply pagination
    if (query.offset) {
      filteredLogs = filteredLogs.slice(query.offset)
    }

    if (query.limit) {
      filteredLogs = filteredLogs.slice(0, query.limit)
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const initialCount = this.logs.length
    this.logs = this.logs.filter(log => log.timestamp >= date)
    return initialCount - this.logs.length
  }

  // Helper methods for testing
  getAllLogs(): AuditLogEntry[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }
}

class MockEncryptionService implements IEncryptionService {
  async encrypt(data: string): Promise<string> {
    return `encrypted_${Buffer.from(data).toString('base64')}`
  }

  async decrypt(encryptedData: string): Promise<string> {
    const base64Data = encryptedData.replace('encrypted_', '')
    return Buffer.from(base64Data, 'base64').toString()
  }
}

describe('AuditLogger', () => {
  let auditLogger: AuditLogger
  let mockRepository: MockAuditRepository
  let mockEncryption: MockEncryptionService

  const testUserId = 'user123' as UserId
  const testPatientId = 'patient456' as PatientId

  beforeEach(() => {
    mockRepository = new MockAuditRepository()
    mockEncryption = new MockEncryptionService()
    auditLogger = new AuditLogger(mockRepository, mockEncryption)
  })

  describe('logDataAccess', () => {
    it('should log data access with all required fields', async () => {
      const logData = {
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted' as const,
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        justification: 'Medical consultation'
      }

      await auditLogger.logDataAccess(logData)

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        justification: 'Medical consultation'
      })
      expect(logs[0].id).toBeDefined()
      expect(logs[0].timestamp).toBeInstanceOf(Date)
    })

    it('should encrypt sensitive data in log entries', async () => {
      const sensitiveData = { ssn: '123-45-6789', medicalHistory: 'confidential' }
      const logData = {
        userId: testUserId,
        patientId: testPatientId,
        operation: 'update',
        dataType: 'patient',
        accessResult: 'granted' as const,
        oldValues: sensitiveData,
        newValues: { ...sensitiveData, updated: true }
      }

      await auditLogger.logDataAccess(logData)

      const logs = mockRepository.getAllLogs()
      expect(logs[0].oldValues).toMatch(/^encrypted_/)
      expect(logs[0].newValues).toMatch(/^encrypted_/)
    })

    it('should handle encryption failures gracefully', async () => {
      const failingEncryption = {
        encrypt: jest.fn().mockRejectedValue(new Error('Encryption failed')),
        decrypt: jest.fn()
      }
      const auditLoggerWithFailingEncryption = new AuditLogger(mockRepository, failingEncryption)

      const logData = {
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted' as const,
        oldValues: { sensitive: 'data' }
      }

      await auditLoggerWithFailingEncryption.logDataAccess(logData)

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].oldValues).toContain('Encryption failed')
    })

    it('should detect suspicious activity patterns', async () => {
      // Create multiple failed access attempts
      for (let i = 0; i < 12; i++) {
        await auditLogger.logDataAccess({
          userId: testUserId,
          patientId: testPatientId,
          operation: 'read',
          dataType: 'patient',
          accessResult: 'denied',
          timestamp: new Date()
        })
      }

      const logs = mockRepository.getAllLogs()
      const securityAlerts = logs.filter(log => log.operation === 'security_alert')
      expect(securityAlerts.length).toBeGreaterThan(0)
    })

    it('should handle audit logging failures without breaking main flow', async () => {
      const failingRepository = {
        create: jest.fn().mockRejectedValue(new Error('Database error')),
        search: jest.fn(),
        deleteOlderThan: jest.fn()
      }
      const auditLoggerWithFailingRepo = new AuditLogger(failingRepository, mockEncryption)

      const logData = {
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted' as const
      }

      // Should not throw error
      await expect(auditLoggerWithFailingRepo.logDataAccess(logData)).resolves.toBeUndefined()
    })
  })

  describe('logDataModification', () => {
    it('should log data modifications with old and new values', async () => {
      const oldValues = { name: 'John Doe', age: 30 }
      const newValues = { name: 'John Smith', age: 31 }

      await auditLogger.logDataModification(
        testUserId,
        testPatientId,
        'update',
        'patient',
        oldValues,
        newValues,
        'Patient information update'
      )

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        userId: testUserId,
        patientId: testPatientId,
        operation: 'update',
        dataType: 'patient',
        accessResult: 'granted',
        justification: 'Patient information update'
      })
    })

    it('should handle create operations without old values', async () => {
      const newValues = { name: 'Jane Doe', age: 25 }

      await auditLogger.logDataModification(
        testUserId,
        testPatientId,
        'create',
        'patient',
        undefined,
        newValues,
        'New patient registration'
      )

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].operation).toBe('create')
      expect(logs[0].oldValues).toBeUndefined()
    })

    it('should handle delete operations without new values', async () => {
      const oldValues = { name: 'John Doe', age: 30 }

      await auditLogger.logDataModification(
        testUserId,
        testPatientId,
        'delete',
        'patient',
        oldValues,
        undefined,
        'Patient record deletion'
      )

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].operation).toBe('delete')
      expect(logs[0].newValues).toBeUndefined()
    })
  })

  describe('logAuthenticationEvent', () => {
    it('should log successful login events', async () => {
      await auditLogger.logAuthenticationEvent(
        testUserId,
        'login',
        true,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        userId: testUserId,
        patientId: 'system',
        operation: 'login',
        dataType: 'authentication',
        accessResult: 'granted',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      })
    })

    it('should log failed login attempts', async () => {
      await auditLogger.logAuthenticationEvent(
        testUserId,
        'failed_login',
        false,
        '192.168.1.1'
      )

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        operation: 'failed_login',
        accessResult: 'denied'
      })
    })
  })

  describe('logLGPDEvent', () => {
    it('should log LGPD compliance events', async () => {
      const eventDetails = {
        consentType: 'data_processing',
        legalBasis: 'legitimate_interest'
      }

      await auditLogger.logLGPDEvent(
        testUserId,
        testPatientId,
        'consent_granted',
        eventDetails
      )

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        userId: testUserId,
        patientId: testPatientId,
        operation: 'consent_granted',
        dataType: 'lgpd_compliance',
        accessResult: 'granted'
      })
    })

    it('should log data breach detection events', async () => {
      const breachDetails = {
        severity: 'high',
        affectedRecords: 100,
        detectionMethod: 'automated'
      }

      await auditLogger.logLGPDEvent(
        testUserId,
        testPatientId,
        'breach_detected',
        breachDetails
      )

      const logs = mockRepository.getAllLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].operation).toBe('breach_detected')
    })
  })

  describe('queryAuditLogs', () => {
    beforeEach(async () => {
      // Create test data
      const testLogs = [
        {
          userId: testUserId,
          patientId: testPatientId,
          operation: 'read',
          dataType: 'patient',
          accessResult: 'granted' as const,
          timestamp: new Date('2024-01-01')
        },
        {
          userId: 'user456' as UserId,
          patientId: testPatientId,
          operation: 'update',
          dataType: 'medical_record',
          accessResult: 'granted' as const,
          timestamp: new Date('2024-01-02')
        },
        {
          userId: testUserId,
          patientId: 'patient789' as PatientId,
          operation: 'read',
          dataType: 'patient',
          accessResult: 'denied' as const,
          timestamp: new Date('2024-01-03')
        }
      ]

      for (const logData of testLogs) {
        await auditLogger.logDataAccess(logData)
      }
    })

    it('should filter logs by user ID', async () => {
      const query: AuditQuery = { userId: testUserId }
      const results = await auditLogger.queryAuditLogs(query)

      expect(results).toHaveLength(2)
      expect(results.every(log => log.userId === testUserId)).toBe(true)
    })

    it('should filter logs by patient ID', async () => {
      const query: AuditQuery = { patientId: testPatientId }
      const results = await auditLogger.queryAuditLogs(query)

      expect(results).toHaveLength(2)
      expect(results.every(log => log.patientId === testPatientId)).toBe(true)
    })

    it('should filter logs by operation', async () => {
      const query: AuditQuery = { operation: 'read' }
      const results = await auditLogger.queryAuditLogs(query)

      expect(results).toHaveLength(2)
      expect(results.every(log => log.operation === 'read')).toBe(true)
    })

    it('should filter logs by access result', async () => {
      const query: AuditQuery = { accessResult: 'denied' }
      const results = await auditLogger.queryAuditLogs(query)

      expect(results).toHaveLength(1)
      expect(results[0].accessResult).toBe('denied')
    })

    it('should filter logs by date range', async () => {
      const query: AuditQuery = {
        fromDate: new Date('2024-01-02'),
        toDate: new Date('2024-01-03')
      }
      const results = await auditLogger.queryAuditLogs(query)

      expect(results).toHaveLength(2)
    })

    it('should apply pagination', async () => {
      const query: AuditQuery = { limit: 2, offset: 1 }
      const results = await auditLogger.queryAuditLogs(query)

      expect(results).toHaveLength(2)
    })

    it('should decrypt sensitive data in query results', async () => {
      // Add a log with encrypted data
      await auditLogger.logDataAccess({
        userId: testUserId,
        patientId: testPatientId,
        operation: 'update',
        dataType: 'patient',
        accessResult: 'granted',
        oldValues: { sensitive: 'data' }
      })

      const results = await auditLogger.queryAuditLogs({ userId: testUserId })
      const logWithData = results.find(log => log.oldValues)

      expect(logWithData?.oldValues).toEqual({ sensitive: 'data' })
    })
  })

  describe('generateAuditStatistics', () => {
    beforeEach(async () => {
      // Create diverse test data
      const testLogs = [
        { operation: 'read', accessResult: 'granted' as const, patientId: testPatientId },
        { operation: 'read', accessResult: 'granted' as const, patientId: testPatientId },
        { operation: 'update', accessResult: 'granted' as const, patientId: 'patient789' as PatientId },
        { operation: 'read', accessResult: 'denied' as const, patientId: testPatientId },
        { operation: 'delete', accessResult: 'granted' as const, patientId: 'patient789' as PatientId }
      ]

      for (const logData of testLogs) {
        await auditLogger.logDataAccess({
          userId: testUserId,
          dataType: 'patient',
          timestamp: new Date(),
          ...logData
        })
      }
    })

    it('should generate comprehensive audit statistics', async () => {
      const stats = await auditLogger.generateAuditStatistics()

      expect(stats.totalLogs).toBe(5)
      expect(stats.accessAttempts).toBe(5)
      expect(stats.deniedAccesses).toBe(1)
      expect(stats.uniqueUsers).toBe(1)
      expect(stats.mostAccessedPatients).toHaveLength(2)
      expect(stats.operationCounts).toHaveProperty('read', 3)
      expect(stats.operationCounts).toHaveProperty('update', 1)
      expect(stats.operationCounts).toHaveProperty('delete', 1)
    })

    it('should filter statistics by date range', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const stats = await auditLogger.generateAuditStatistics(yesterday, tomorrow)

      expect(stats.totalLogs).toBe(5)
    })

    it('should identify most accessed patients', async () => {
      const stats = await auditLogger.generateAuditStatistics()

      expect(stats.mostAccessedPatients[0]).toEqual({
        patientId: testPatientId,
        accessCount: 3
      })
    })
  })

  describe('exportAuditLogs', () => {
    beforeEach(async () => {
      await auditLogger.logDataAccess({
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date('2024-01-01'),
        justification: 'Medical consultation'
      })
    })

    it('should export logs in JSON format', async () => {
      const exported = await auditLogger.exportAuditLogs({}, 'json')
      const parsed = JSON.parse(exported)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toHaveProperty('userId', testUserId)
    })

    it('should export logs in CSV format', async () => {
      const exported = await auditLogger.exportAuditLogs({}, 'csv')

      expect(exported).toContain('id,userId,patientId,operation')
      expect(exported).toContain(testUserId)
      expect(exported).toContain('read')
    })

    it('should export logs in XML format', async () => {
      const exported = await auditLogger.exportAuditLogs({}, 'xml')

      expect(exported).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(exported).toContain('<auditLogs>')
      expect(exported).toContain('<auditLog>')
      expect(exported).toContain(`<userId>${testUserId}</userId>`)
    })

    it('should throw error for unsupported format', async () => {
      await expect(
        auditLogger.exportAuditLogs({}, 'pdf' as any)
      ).rejects.toThrow('Unsupported export format: pdf')
    })
  })

  describe('purgeOldLogs', () => {
    beforeEach(async () => {
      // Create logs with different dates
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10)

      const recentDate = new Date()

      await auditLogger.logDataAccess({
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: oldDate
      })

      await auditLogger.logDataAccess({
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: recentDate
      })
    })

    it('should purge logs older than retention period', async () => {
      const purgedCount = await auditLogger.purgeOldLogs(7)

      expect(purgedCount).toBe(1)
      
      const remainingLogs = await auditLogger.queryAuditLogs({})
      expect(remainingLogs.length).toBeGreaterThan(0) // Should have recent logs + purge log
    })

    it('should use default retention period of 7 years', async () => {
      const purgedCount = await auditLogger.purgeOldLogs()

      expect(purgedCount).toBe(0) // No logs older than 7 years
    })

    it('should log the purge operation', async () => {
      await auditLogger.purgeOldLogs(7)

      const logs = await auditLogger.queryAuditLogs({ operation: 'purge_audit_logs' })
      expect(logs).toHaveLength(1)
      expect(logs[0].operation).toBe('purge_audit_logs')
    })
  })
})