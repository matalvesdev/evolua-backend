// ============================================================================
// SUPABASE AUDIT REPOSITORY TESTS
// Tests for Supabase audit repository implementation
// ============================================================================

import { SupabaseAuditRepository } from '../../../infrastructure/repositories/SupabaseAuditRepository'
import { AuditLogEntry, AuditQuery } from '../../../infrastructure/services/AuditLogger'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { UserId } from '../../../domain/value-objects/UserId'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  gte: jest.fn(() => mockSupabaseClient),
  lte: jest.fn(() => mockSupabaseClient),
  lt: jest.fn(() => mockSupabaseClient),
  not: jest.fn(() => mockSupabaseClient),
  or: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
  range: jest.fn(() => mockSupabaseClient)
}

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('SupabaseAuditRepository', () => {
  let repository: SupabaseAuditRepository
  const testUserId = 'user123' as UserId
  const testPatientId = 'patient456' as PatientId

  beforeEach(() => {
    repository = new SupabaseAuditRepository()
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should insert audit log entry into database', async () => {
      const logEntry: AuditLogEntry = {
        id: 'audit_123',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        justification: 'Medical consultation',
        oldValues: { name: 'John' },
        newValues: { name: 'John Doe' },
        sessionId: 'session123',
        requestId: 'request456'
      }

      mockSupabaseClient.insert.mockResolvedValue({ error: null })

      await repository.create(logEntry)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        id: 'audit_123',
        user_id: testUserId,
        patient_id: testPatientId,
        operation: 'read',
        table_name: 'patient',
        record_id: null,
        old_values: JSON.stringify({ name: 'John' }),
        new_values: JSON.stringify({ name: 'John Doe' }),
        timestamp: '2024-01-01T10:00:00.000Z',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        metadata: {
          accessResult: 'granted',
          justification: 'Medical consultation',
          sessionId: 'session123',
          requestId: 'request456'
        }
      })
    })

    it('should handle system patient ID correctly', async () => {
      const logEntry: AuditLogEntry = {
        id: 'audit_123',
        userId: testUserId,
        patientId: 'system' as PatientId,
        operation: 'login',
        dataType: 'authentication',
        accessResult: 'granted',
        timestamp: new Date()
      }

      mockSupabaseClient.insert.mockResolvedValue({ error: null })

      await repository.create(logEntry)

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: null
        })
      )
    })

    it('should handle entries without optional fields', async () => {
      const logEntry: AuditLogEntry = {
        id: 'audit_123',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date()
      }

      mockSupabaseClient.insert.mockResolvedValue({ error: null })

      await repository.create(logEntry)

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          old_values: null,
          new_values: null,
          ip_address: null,
          user_agent: null,
          metadata: {
            accessResult: 'granted',
            justification: undefined,
            sessionId: undefined,
            requestId: undefined
          }
        })
      )
    })

    it('should throw error when database operation fails', async () => {
      const logEntry: AuditLogEntry = {
        id: 'audit_123',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date()
      }

      mockSupabaseClient.insert.mockResolvedValue({
        error: { message: 'Database connection failed' }
      })

      await expect(repository.create(logEntry)).rejects.toThrow(
        'Failed to create audit log entry: Database error: Database connection failed'
      )
    })
  })

  describe('search', () => {
    const mockDatabaseRecords = [
      {
        id: 'audit_1',
        user_id: testUserId,
        patient_id: testPatientId,
        operation: 'read',
        table_name: 'patient',
        old_values: null,
        new_values: null,
        timestamp: '2024-01-01T10:00:00Z',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        metadata: {
          accessResult: 'granted',
          justification: 'Medical consultation'
        }
      },
      {
        id: 'audit_2',
        user_id: 'user456',
        patient_id: testPatientId,
        operation: 'update',
        table_name: 'medical_record',
        old_values: '{"name":"John"}',
        new_values: '{"name":"John Doe"}',
        timestamp: '2024-01-02T10:00:00Z',
        ip_address: null,
        user_agent: null,
        metadata: {
          accessResult: 'granted'
        }
      }
    ]

    beforeEach(() => {
      mockSupabaseClient.select.mockResolvedValue({
        data: mockDatabaseRecords,
        error: null
      })
    })

    it('should search audit logs without filters', async () => {
      const query: AuditQuery = {}
      const results = await repository.search(query)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('timestamp', { ascending: false })
      expect(results).toHaveLength(2)
    })

    it('should filter by user ID', async () => {
      const query: AuditQuery = { userId: testUserId }
      await repository.search(query)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', testUserId)
    })

    it('should filter by patient ID', async () => {
      const query: AuditQuery = { patientId: testPatientId }
      await repository.search(query)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('patient_id', testPatientId)
    })

    it('should not filter by system patient ID', async () => {
      const query: AuditQuery = { patientId: 'system' as PatientId }
      await repository.search(query)

      expect(mockSupabaseClient.eq).not.toHaveBeenCalledWith('patient_id', 'system')
    })

    it('should filter by operation', async () => {
      const query: AuditQuery = { operation: 'read' }
      await repository.search(query)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('operation', 'read')
    })

    it('should filter by data type', async () => {
      const query: AuditQuery = { dataType: 'patient' }
      await repository.search(query)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('table_name', 'patient')
    })

    it('should filter by access result', async () => {
      const query: AuditQuery = { accessResult: 'denied' }
      await repository.search(query)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('metadata->>accessResult', 'denied')
    })

    it('should filter by date range', async () => {
      const fromDate = new Date('2024-01-01')
      const toDate = new Date('2024-01-31')
      const query: AuditQuery = { fromDate, toDate }
      
      await repository.search(query)

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('timestamp', fromDate.toISOString())
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('timestamp', toDate.toISOString())
    })

    it('should apply pagination with limit', async () => {
      const query: AuditQuery = { limit: 10 }
      await repository.search(query)

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10)
    })

    it('should apply pagination with offset and limit', async () => {
      const query: AuditQuery = { limit: 10, offset: 20 }
      await repository.search(query)

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(20, 29)
    })

    it('should transform database records to AuditLogEntry objects', async () => {
      const query: AuditQuery = {}
      const results = await repository.search(query)

      expect(results[0]).toEqual({
        id: 'audit_1',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        justification: 'Medical consultation',
        oldValues: undefined,
        newValues: undefined,
        sessionId: undefined,
        requestId: undefined
      })

      expect(results[1]).toEqual({
        id: 'audit_2',
        userId: 'user456',
        patientId: testPatientId,
        operation: 'update',
        dataType: 'medical_record',
        accessResult: 'granted',
        timestamp: new Date('2024-01-02T10:00:00Z'),
        ipAddress: null,
        userAgent: null,
        justification: undefined,
        oldValues: { name: 'John' },
        newValues: { name: 'John Doe' },
        sessionId: undefined,
        requestId: undefined
      })
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' }
      })

      const query: AuditQuery = {}
      await expect(repository.search(query)).rejects.toThrow(
        'Failed to search audit logs: Database error: Connection timeout'
      )
    })

    it('should handle null data response', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: null
      })

      const query: AuditQuery = {}
      const results = await repository.search(query)

      expect(results).toEqual([])
    })
  })

  describe('deleteOlderThan', () => {
    it('should delete logs older than specified date', async () => {
      const cutoffDate = new Date('2024-01-01')
      const deletedRecords = [{ id: 'audit_1' }, { id: 'audit_2' }]

      mockSupabaseClient.delete.mockResolvedValue({
        data: deletedRecords,
        error: null
      })

      const result = await repository.deleteOlderThan(cutoffDate)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(mockSupabaseClient.lt).toHaveBeenCalledWith('timestamp', cutoffDate.toISOString())
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id')
      expect(result).toBe(2)
    })

    it('should return 0 when no records are deleted', async () => {
      const cutoffDate = new Date('2024-01-01')

      mockSupabaseClient.delete.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await repository.deleteOlderThan(cutoffDate)

      expect(result).toBe(0)
    })

    it('should handle database errors', async () => {
      const cutoffDate = new Date('2024-01-01')

      mockSupabaseClient.delete.mockResolvedValue({
        data: null,
        error: { message: 'Permission denied' }
      })

      await expect(repository.deleteOlderThan(cutoffDate)).rejects.toThrow(
        'Failed to delete old audit logs: Database error: Permission denied'
      )
    })
  })

  describe('getStatistics', () => {
    const mockStatisticsData = [
      {
        operation: 'read',
        user_id: testUserId,
        metadata: { accessResult: 'granted' }
      },
      {
        operation: 'read',
        user_id: testUserId,
        metadata: { accessResult: 'granted' }
      },
      {
        operation: 'update',
        user_id: 'user456',
        metadata: { accessResult: 'granted' }
      },
      {
        operation: 'read',
        user_id: testUserId,
        metadata: { accessResult: 'denied' }
      }
    ]

    beforeEach(() => {
      mockSupabaseClient.select.mockResolvedValue({
        data: mockStatisticsData,
        error: null
      })
    })

    it('should generate audit statistics', async () => {
      const stats = await repository.getStatistics()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('operation, user_id, metadata')
      
      expect(stats).toEqual({
        totalLogs: 4,
        uniqueUsers: 2,
        operationCounts: {
          read: 3,
          update: 1
        },
        accessResultCounts: {
          granted: 3,
          denied: 1
        }
      })
    })

    it('should filter statistics by date range', async () => {
      const fromDate = new Date('2024-01-01')
      const toDate = new Date('2024-01-31')

      await repository.getStatistics(fromDate, toDate)

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('timestamp', fromDate.toISOString())
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('timestamp', toDate.toISOString())
    })

    it('should handle missing metadata gracefully', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [
          {
            operation: 'read',
            user_id: testUserId,
            metadata: null
          }
        ],
        error: null
      })

      const stats = await repository.getStatistics()

      expect(stats.accessResultCounts).toEqual({
        unknown: 1
      })
    })
  })

  describe('getMostAccessedPatients', () => {
    const mockPatientAccessData = [
      { patient_id: testPatientId },
      { patient_id: testPatientId },
      { patient_id: testPatientId },
      { patient_id: 'patient789' },
      { patient_id: 'patient789' },
      { patient_id: 'patient101' }
    ]

    beforeEach(() => {
      mockSupabaseClient.select.mockResolvedValue({
        data: mockPatientAccessData,
        error: null
      })
    })

    it('should return most accessed patients', async () => {
      const result = await repository.getMostAccessedPatients(5)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('patient_id')
      expect(mockSupabaseClient.not).toHaveBeenCalledWith('patient_id', 'is', null)
      
      expect(result).toEqual([
        { patientId: testPatientId, accessCount: 3 },
        { patientId: 'patient789', accessCount: 2 },
        { patientId: 'patient101', accessCount: 1 }
      ])
    })

    it('should limit results to specified count', async () => {
      const result = await repository.getMostAccessedPatients(2)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ patientId: testPatientId, accessCount: 3 })
      expect(result[1]).toEqual({ patientId: 'patient789', accessCount: 2 })
    })

    it('should filter by date when provided', async () => {
      const fromDate = new Date('2024-01-01')
      await repository.getMostAccessedPatients(10, fromDate)

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('timestamp', fromDate.toISOString())
    })
  })

  describe('getSuspiciousActivities', () => {
    const mockSuspiciousData = [
      {
        id: 'audit_1',
        user_id: testUserId,
        patient_id: testPatientId,
        operation: 'security_alert',
        table_name: 'security',
        timestamp: '2024-01-01T10:00:00Z',
        metadata: { accessResult: 'denied' }
      }
    ]

    beforeEach(() => {
      mockSupabaseClient.select.mockResolvedValue({
        data: mockSuspiciousData,
        error: null
      })
    })

    it('should return suspicious activities', async () => {
      const result = await repository.getSuspiciousActivities(50)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.or).toHaveBeenCalledWith('operation.eq.security_alert,metadata->>accessResult.eq.denied')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('timestamp', { ascending: false })
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50)
      
      expect(result).toHaveLength(1)
      expect(result[0].operation).toBe('security_alert')
    })

    it('should filter by date when provided', async () => {
      const fromDate = new Date('2024-01-01')
      await repository.getSuspiciousActivities(50, fromDate)

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('timestamp', fromDate.toISOString())
    })
  })
})