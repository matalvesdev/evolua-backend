// ============================================================================
// AUDIT REPORTING SERVICE TESTS
// Comprehensive tests for audit reporting and analytics functionality
// ============================================================================

import { AuditReportingService, AuditReport, AuditReportType, AuditReportFilters } from '../../../infrastructure/services/AuditReportingService'
import { AuditLogger, AuditLogEntry, AuditQuery, AuditStatistics } from '../../../infrastructure/services/AuditLogger'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { UserId } from '../../../domain/value-objects/UserId'

// Mock AuditLogger
class MockAuditLogger {
  private mockLogs: AuditLogEntry[] = []
  private mockStatistics: AuditStatistics = {
    totalLogs: 0,
    accessAttempts: 0,
    deniedAccesses: 0,
    uniqueUsers: 0,
    mostAccessedPatients: [],
    operationCounts: {},
    suspiciousActivities: []
  }

  setMockLogs(logs: AuditLogEntry[]): void {
    this.mockLogs = logs
  }

  setMockStatistics(stats: AuditStatistics): void {
    this.mockStatistics = stats
  }

  async logDataAccess(logData: any): Promise<void> {
    // Mock implementation
  }

  async logDataModification(userId: UserId, patientId: PatientId, operation: string, dataType: string, oldValues?: any, newValues?: any, justification?: string): Promise<void> {
    // Mock implementation
  }

  async queryAuditLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    return this.mockLogs
  }

  async generateAuditStatistics(fromDate?: Date, toDate?: Date): Promise<AuditStatistics> {
    return this.mockStatistics
  }
}

describe('AuditReportingService', () => {
  let reportingService: AuditReportingService
  let mockAuditLogger: MockAuditLogger

  const testUserId = new UserId('550e8400-e29b-41d4-a716-446655440000')
  const testPatientId = new PatientId('660e8400-e29b-41d4-a716-446655440001')

  beforeEach(() => {
    mockAuditLogger = new MockAuditLogger()
    reportingService = new AuditReportingService(mockAuditLogger as any)
  })

  describe('generateReport', () => {
    const mockAuditLogs: AuditLogEntry[] = [
      {
        id: 'audit_1',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        justification: 'Medical consultation'
      },
      {
        id: 'audit_2',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'update',
        dataType: 'medical_record',
        accessResult: 'granted',
        timestamp: new Date('2024-01-01T11:00:00Z'),
        justification: 'Update medical history'
      },
      {
        id: 'audit_3',
        userId: new UserId('770e8400-e29b-41d4-a716-446655440002'),
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'denied',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        justification: 'Access denied - insufficient permissions'
      }
    ]

    const mockStatistics: AuditStatistics = {
      totalLogs: 3,
      accessAttempts: 3,
      deniedAccesses: 1,
      uniqueUsers: 2,
      mostAccessedPatients: [{ patientId: testPatientId, accessCount: 3 }],
      operationCounts: { read: 2, update: 1 },
      suspiciousActivities: []
    }

    beforeEach(() => {
      mockAuditLogger.setMockLogs(mockAuditLogs)
      mockAuditLogger.setMockStatistics(mockStatistics)
    })

    it('should generate compliance summary report', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      const report = await reportingService.generateReport(
        'compliance_summary',
        { includeSystemEvents: true },
        dateRange,
        testUserId
      )

      expect(report).toMatchObject({
        title: 'LGPD Compliance Summary Report',
        reportType: 'compliance_summary',
        generatedBy: testUserId,
        dateRange
      })
      expect(report.id).toBeDefined()
      expect(report.generatedAt).toBeInstanceOf(Date)
      expect(report.data.totalEvents).toBe(3)
      expect(report.data.statistics).toEqual(mockStatistics)
      expect(report.summary).toBeDefined()
      expect(report.recommendations).toBeDefined()
    })

    it('should generate security incidents report', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      const report = await reportingService.generateReport(
        'security_incidents',
        { 
          accessResults: ['denied'],
          operations: ['security_alert', 'failed_login', 'unauthorized_access'],
          severityLevel: 'medium'
        },
        dateRange,
        testUserId
      )

      expect(report.title).toBe('Security Incidents Analysis Report')
      expect(report.reportType).toBe('security_incidents')
      expect(report.filters.accessResults).toContain('denied')
    })

    it('should generate user activity report', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      const report = await reportingService.generateReport(
        'user_activity',
        { 
          userIds: [testUserId],
          includeSystemEvents: false
        },
        dateRange,
        testUserId
      )

      expect(report.title).toBe('User Activity Report')
      expect(report.reportType).toBe('user_activity')
      expect(report.filters.userIds).toContain(testUserId)
    })

    it('should generate patient access report', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      const report = await reportingService.generateReport(
        'patient_access',
        { 
          patientIds: [testPatientId],
          operations: ['read', 'update', 'create', 'delete'],
          dataTypes: ['patient', 'medical_record', 'document']
        },
        dateRange,
        testUserId
      )

      expect(report.title).toBe('Patient Data Access Report')
      expect(report.reportType).toBe('patient_access')
      expect(report.filters.patientIds).toContain(testPatientId)
    })

    it('should include comprehensive report data', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      const report = await reportingService.generateReport(
        'compliance_summary',
        {},
        dateRange,
        testUserId
      )

      expect(report.data).toMatchObject({
        totalEvents: 3,
        events: mockAuditLogs,
        statistics: mockStatistics
      })
      expect(report.data.trends).toBeDefined()
      expect(report.data.anomalies).toBeDefined()
      expect(report.data.complianceMetrics).toBeDefined()
    })

    it('should generate appropriate summary and recommendations', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      const report = await reportingService.generateReport(
        'compliance_summary',
        {},
        dateRange,
        testUserId
      )

      expect(report.summary.keyFindings).toContain('Total audit events: 3')
      expect(report.summary.keyFindings).toContain('Unique users active: 2')
      expect(report.summary.riskLevel).toMatch(/^(low|medium|high|critical)$/)
      expect(report.summary.complianceScore).toBeGreaterThanOrEqual(0)
      expect(report.summary.complianceScore).toBeLessThanOrEqual(100)
      expect(report.summary.securityScore).toBeGreaterThanOrEqual(0)
      expect(report.summary.securityScore).toBeLessThanOrEqual(100)
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should handle report generation errors', async () => {
      // Mock audit logger to throw error
      mockAuditLogger.queryAuditLogs = jest.fn().mockRejectedValue(new Error('Database error'))

      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      await expect(
        reportingService.generateReport('compliance_summary', {}, dateRange, testUserId)
      ).rejects.toThrow('Audit report generation failed')
    })
  })

  describe('generateComplianceReport', () => {
    it('should generate compliance report with correct parameters', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      mockAuditLogger.setMockLogs([])
      mockAuditLogger.setMockStatistics({
        totalLogs: 0,
        accessAttempts: 0,
        deniedAccesses: 0,
        uniqueUsers: 0,
        mostAccessedPatients: [],
        operationCounts: {},
        suspiciousActivities: []
      })

      const report = await reportingService.generateComplianceReport(dateRange, testUserId)

      expect(report.reportType).toBe('compliance_summary')
      expect(report.filters.includeSystemEvents).toBe(true)
      expect(report.title).toBe('LGPD Compliance Summary Report')
    })
  })

  describe('generateSecurityReport', () => {
    it('should generate security report with correct parameters', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      mockAuditLogger.setMockLogs([])
      mockAuditLogger.setMockStatistics({
        totalLogs: 0,
        accessAttempts: 0,
        deniedAccesses: 0,
        uniqueUsers: 0,
        mostAccessedPatients: [],
        operationCounts: {},
        suspiciousActivities: []
      })

      const report = await reportingService.generateSecurityReport(dateRange, testUserId)

      expect(report.reportType).toBe('security_incidents')
      expect(report.filters.accessResults).toContain('denied')
      expect(report.filters.operations).toContain('security_alert')
      expect(report.filters.severityLevel).toBe('medium')
    })
  })

  describe('generateUserActivityReport', () => {
    it('should generate user activity report for specific user', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      mockAuditLogger.setMockLogs([])
      mockAuditLogger.setMockStatistics({
        totalLogs: 0,
        accessAttempts: 0,
        deniedAccesses: 0,
        uniqueUsers: 0,
        mostAccessedPatients: [],
        operationCounts: {},
        suspiciousActivities: []
      })

      const report = await reportingService.generateUserActivityReport(testUserId, dateRange, testUserId)

      expect(report.reportType).toBe('user_activity')
      expect(report.filters.userIds).toContain(testUserId)
      expect(report.filters.includeSystemEvents).toBe(false)
    })

    it('should generate user activity report for all users', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      mockAuditLogger.setMockLogs([])
      mockAuditLogger.setMockStatistics({
        totalLogs: 0,
        accessAttempts: 0,
        deniedAccesses: 0,
        uniqueUsers: 0,
        mostAccessedPatients: [],
        operationCounts: {},
        suspiciousActivities: []
      })

      const report = await reportingService.generateUserActivityReport(undefined, dateRange, testUserId)

      expect(report.reportType).toBe('user_activity')
      expect(report.filters.userIds).toBeUndefined()
    })
  })

  describe('generatePatientAccessReport', () => {
    it('should generate patient access report for specific patient', async () => {
      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      }

      mockAuditLogger.setMockLogs([])
      mockAuditLogger.setMockStatistics({
        totalLogs: 0,
        accessAttempts: 0,
        deniedAccesses: 0,
        uniqueUsers: 0,
        mostAccessedPatients: [],
        operationCounts: {},
        suspiciousActivities: []
      })

      const report = await reportingService.generatePatientAccessReport(testPatientId, dateRange, testUserId)

      expect(report.reportType).toBe('patient_access')
      expect(report.filters.patientIds).toContain(testPatientId)
      expect(report.filters.operations).toContain('read')
      expect(report.filters.dataTypes).toContain('patient')
    })
  })

  describe('detectSuspiciousActivities', () => {
    // Helper function to generate valid patient IDs for tests
    const generateTestPatientId = (index: number): PatientId => {
      // Generate a valid UUID v4 based on index
      const hex = index.toString(16).padStart(12, '0')
      return new PatientId(`${hex.substring(0, 8)}-${hex.substring(8, 12)}-4000-8000-000000000000`)
    }

    it('should detect unusual access patterns', async () => {
      const mockLogs: AuditLogEntry[] = []
      
      // Create logs showing user accessing many different patients
      for (let i = 0; i < 60; i++) {
        mockLogs.push({
          id: `audit_${i}`,
          userId: testUserId,
          patientId: generateTestPatientId(i),
          operation: 'read',
          dataType: 'patient',
          accessResult: 'granted',
          timestamp: new Date('2024-01-01T10:00:00Z')
        })
      }

      mockAuditLogger.setMockLogs(mockLogs)

      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-02')
      }

      const anomalies = await reportingService.detectSuspiciousActivities(dateRange)

      expect(anomalies.length).toBeGreaterThan(0)
      const unusualAccessAnomaly = anomalies.find(a => a.type === 'unusual_access_pattern')
      expect(unusualAccessAnomaly).toBeDefined()
      expect(unusualAccessAnomaly?.affectedUsers).toContain(testUserId)
    })

    it('should detect excessive failures', async () => {
      const mockLogs: AuditLogEntry[] = []
      
      // Create logs showing many failed access attempts (need >50 for critical)
      for (let i = 0; i < 55; i++) {
        mockLogs.push({
          id: `audit_${i}`,
          userId: testUserId,
          patientId: testPatientId,
          operation: 'read',
          dataType: 'patient',
          accessResult: 'denied',
          timestamp: new Date('2024-01-01T10:00:00Z')
        })
      }

      mockAuditLogger.setMockLogs(mockLogs)

      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-02')
      }

      const anomalies = await reportingService.detectSuspiciousActivities(dateRange)

      expect(anomalies.length).toBeGreaterThan(0)
      const excessiveFailuresAnomaly = anomalies.find(a => a.type === 'excessive_failures')
      expect(excessiveFailuresAnomaly).toBeDefined()
      expect(excessiveFailuresAnomaly?.severity).toBe('critical')
    })

    it('should detect off-hours activity', async () => {
      const mockLogs: AuditLogEntry[] = []
      
      // Create logs showing activity at 2 AM (off hours)
      for (let i = 0; i < 15; i++) {
        mockLogs.push({
          id: `audit_${i}`,
          userId: testUserId,
          patientId: testPatientId,
          operation: 'read',
          dataType: 'patient',
          accessResult: 'granted',
          timestamp: new Date('2024-01-01T02:00:00Z') // 2 AM
        })
      }

      mockAuditLogger.setMockLogs(mockLogs)

      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-02')
      }

      const anomalies = await reportingService.detectSuspiciousActivities(dateRange)

      expect(anomalies.length).toBeGreaterThan(0)
      const offHoursAnomaly = anomalies.find(a => a.type === 'off_hours_activity')
      expect(offHoursAnomaly).toBeDefined()
    })

    it('should detect bulk operations', async () => {
      const mockLogs: AuditLogEntry[] = []
      const baseTime = new Date('2024-01-01T10:00:00Z')
      
      // Create logs showing 25 operations within 1 hour
      for (let i = 0; i < 25; i++) {
        mockLogs.push({
          id: `audit_${i}`,
          userId: testUserId,
          patientId: generateTestPatientId(i % 5), // Cycle through 5 patients
          operation: 'read',
          dataType: 'patient',
          accessResult: 'granted',
          timestamp: new Date(baseTime.getTime() + i * 60 * 1000) // 1 minute apart
        })
      }

      mockAuditLogger.setMockLogs(mockLogs)

      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-02')
      }

      const anomalies = await reportingService.detectSuspiciousActivities(dateRange)

      expect(anomalies.length).toBeGreaterThan(0)
      const bulkOpsAnomaly = anomalies.find(a => a.type === 'bulk_operations')
      expect(bulkOpsAnomaly).toBeDefined()
    })

    it('should sort anomalies by risk score', async () => {
      const mockLogs: AuditLogEntry[] = [
        // High risk: many failed attempts
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `fail_${i}`,
          userId: testUserId,
          patientId: testPatientId,
          operation: 'read',
          dataType: 'patient',
          accessResult: 'denied' as const,
          timestamp: new Date('2024-01-01T10:00:00Z')
        })),
        // Medium risk: off hours activity
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `offhours_${i}`,
          userId: new UserId('880e8400-e29b-41d4-a716-446655440003'),
          patientId: testPatientId,
          operation: 'read',
          dataType: 'patient',
          accessResult: 'granted' as const,
          timestamp: new Date('2024-01-01T02:00:00Z')
        }))
      ]

      mockAuditLogger.setMockLogs(mockLogs)

      const dateRange = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-02')
      }

      const anomalies = await reportingService.detectSuspiciousActivities(dateRange)

      expect(anomalies.length).toBeGreaterThan(1)
      // Should be sorted by risk score (highest first)
      for (let i = 1; i < anomalies.length; i++) {
        expect(anomalies[i - 1].riskScore).toBeGreaterThanOrEqual(anomalies[i].riskScore)
      }
    })
  })

  describe('exportReport', () => {
    let sampleReport: AuditReport

    beforeEach(() => {
      sampleReport = {
        id: 'report_123',
        title: 'Test Report',
        description: 'Test report description',
        generatedAt: new Date('2024-01-01T10:00:00Z'),
        generatedBy: testUserId,
        reportType: 'compliance_summary',
        dateRange: {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-01-31')
        },
        filters: {},
        data: {
          totalEvents: 10,
          events: [],
          statistics: {
            totalLogs: 10,
            accessAttempts: 8,
            deniedAccesses: 2,
            uniqueUsers: 3,
            mostAccessedPatients: [],
            operationCounts: { read: 5, update: 3 },
            suspiciousActivities: []
          },
          trends: [],
          anomalies: [],
          complianceMetrics: {
            lgpdCompliance: {
              consentTracking: 5,
              dataPortabilityRequests: 1,
              dataDeletionRequests: 0,
              breachIncidents: 0,
              responseTime: 24
            },
            accessControl: {
              successfulAccesses: 8,
              deniedAccesses: 2,
              unauthorizedAttempts: 1,
              privilegeViolations: 0
            },
            dataIntegrity: {
              dataModifications: 3,
              unauthorizedChanges: 0,
              dataCorruption: 0,
              backupVerifications: 2
            }
          }
        },
        summary: {
          keyFindings: ['Total events: 10', 'Denied accesses: 2'],
          riskLevel: 'low',
          complianceScore: 95,
          securityScore: 88,
          totalViolations: 1,
          criticalIssues: 0
        },
        recommendations: ['Maintain current security practices', 'Review access patterns monthly']
      }
    })

    it('should export report in JSON format', async () => {
      const exported = await reportingService.exportReport(sampleReport, 'json')
      const parsed = JSON.parse(exported)

      expect(parsed.id).toBe('report_123')
      expect(parsed.title).toBe('Test Report')
      expect(parsed.reportType).toBe('compliance_summary')
    })

    it('should export report in CSV format', async () => {
      const exported = await reportingService.exportReport(sampleReport, 'csv')

      expect(exported).toContain('Report Title,Test Report')
      expect(exported).toContain('Report Type,compliance_summary')
      expect(exported).toContain('Risk Level,low')
      expect(exported).toContain('Compliance Score,95')
      expect(exported).toContain('Security Score,88')
    })

    it('should export report in XML format', async () => {
      const exported = await reportingService.exportReport(sampleReport, 'xml')

      expect(exported).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(exported).toContain('<auditReport>')
      expect(exported).toContain('<id>report_123</id>')
      expect(exported).toContain('<title>Test Report</title>')
      expect(exported).toContain('<reportType>compliance_summary</reportType>')
    })

    it('should export report in PDF format', async () => {
      const exported = await reportingService.exportReport(sampleReport, 'pdf')

      // PDF export is a placeholder implementation
      expect(exported).toContain('PDF Report: Test Report')
      expect(exported).toContain('2024-01-01T10:00:00.000Z')
    })

    it('should throw error for unsupported format', async () => {
      await expect(
        reportingService.exportReport(sampleReport, 'docx' as any)
      ).rejects.toThrow('Unsupported export format: docx')
    })
  })
})