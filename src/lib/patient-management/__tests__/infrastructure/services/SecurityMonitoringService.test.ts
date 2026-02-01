// ============================================================================
// SECURITY MONITORING SERVICE TESTS
// Comprehensive tests for security monitoring and alerting functionality
// ============================================================================

import { SecurityMonitoringService, SecurityAlert, SecurityAlertType, SecurityDashboard } from '../../../infrastructure/services/SecurityMonitoringService'
import { AuditLogger, AuditLogEntry } from '../../../infrastructure/services/AuditLogger'
import { AuditReportingService, AuditAnomaly } from '../../../infrastructure/services/AuditReportingService'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { UserId } from '../../../domain/value-objects/UserId'

// Mock AuditLogger
class MockAuditLogger {
  private mockLogs: AuditLogEntry[] = []

  setMockLogs(logs: AuditLogEntry[]): void {
    this.mockLogs = logs
  }

  async logDataAccess(logData: any): Promise<void> {
    // Mock implementation
  }

  async logDataModification(userId: UserId, patientId: PatientId, operation: string, dataType: string, oldValues?: any, newValues?: any, justification?: string): Promise<void> {
    // Mock implementation
  }

  async queryAuditLogs(query: any): Promise<AuditLogEntry[]> {
    return this.mockLogs.filter(log => {
      if (query.userId && log.userId !== query.userId) return false
      if (query.operation && log.operation !== query.operation) return false
      if (query.accessResult && log.accessResult !== query.accessResult) return false
      if (query.fromDate && log.timestamp < query.fromDate) return false
      if (query.toDate && log.timestamp > query.toDate) return false
      return true
    })
  }
}

// Mock AuditReportingService
class MockAuditReportingService {
  private mockAnomalies: AuditAnomaly[] = []

  setMockAnomalies(anomalies: AuditAnomaly[]): void {
    this.mockAnomalies = anomalies
  }

  async detectSuspiciousActivities(dateRange: { fromDate: Date; toDate: Date }): Promise<AuditAnomaly[]> {
    return this.mockAnomalies
  }
}

describe('SecurityMonitoringService', () => {
  let securityService: SecurityMonitoringService
  let mockAuditLogger: MockAuditLogger
  let mockReportingService: MockAuditReportingService

  const testUserId = new UserId('550e8400-e29b-41d4-a716-446655440000')
  const testPatientId = new PatientId('660e8400-e29b-41d4-a716-446655440001')
  let systemPatientId: PatientId

  // Helper function to generate valid patient IDs for tests
  const generateTestPatientId = (index: number): PatientId => {
    const hex = index.toString(16).padStart(12, '0')
    return new PatientId(`${hex.substring(0, 8)}-${hex.substring(8, 12)}-4000-8000-000000000000`)
  }

  beforeEach(() => {
    mockAuditLogger = new MockAuditLogger()
    mockReportingService = new MockAuditReportingService()
    securityService = new SecurityMonitoringService(
      mockAuditLogger as any,
      mockReportingService as any
    )
    // Use a valid UUID v4 for system patient ID
    systemPatientId = new PatientId('00000000-0000-4000-8000-000000000000')
  })

  describe('startMonitoring', () => {
    it('should start security monitoring', async () => {
      const logSpy = jest.spyOn(mockAuditLogger, 'logDataAccess')

      await securityService.startMonitoring()

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'start_security_monitoring',
          dataType: 'security',
          accessResult: 'granted'
        })
      )
    })
  })

  describe('stopMonitoring', () => {
    it('should stop security monitoring', async () => {
      const logSpy = jest.spyOn(mockAuditLogger, 'logDataAccess')

      await securityService.stopMonitoring()

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'stop_security_monitoring',
          dataType: 'security',
          accessResult: 'granted'
        })
      )
    })
  })

  describe('processAuditEvent', () => {
    beforeEach(async () => {
      await securityService.startMonitoring()
    })

    it('should process audit events for threat detection', async () => {
      const auditEvent: AuditLogEntry = {
        id: 'audit_1',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'failed_login',
        dataType: 'authentication',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: 'Invalid credentials'
      }

      // Should not throw error
      await expect(securityService.processAuditEvent(auditEvent)).resolves.toBeUndefined()
    })

    it('should not process events when monitoring is stopped', async () => {
      await securityService.stopMonitoring()

      const auditEvent: AuditLogEntry = {
        id: 'audit_1',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date()
      }

      // Should complete without processing
      await expect(securityService.processAuditEvent(auditEvent)).resolves.toBeUndefined()
    })

    it('should detect brute force attacks', async () => {
      // Set up multiple failed login attempts
      const failedLogins: AuditLogEntry[] = Array.from({ length: 6 }, (_, i) => ({
        id: `audit_${i}`,
        userId: testUserId,
        patientId: systemPatientId,
        operation: 'failed_login',
        dataType: 'authentication',
        accessResult: 'denied',
        timestamp: new Date(Date.now() - (5 - i) * 60 * 1000) // Spread over 5 minutes
      }))

      mockAuditLogger.setMockLogs(failedLogins)

      const auditEvent: AuditLogEntry = {
        id: 'audit_new',
        userId: testUserId,
        patientId: systemPatientId,
        operation: 'failed_login',
        dataType: 'authentication',
        accessResult: 'denied',
        timestamp: new Date()
      }

      await securityService.processAuditEvent(auditEvent)

      // Check if brute force alert was created
      const alerts = await securityService.getSecurityAlerts({ type: 'brute_force_attack' })
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].type).toBe('brute_force_attack')
      expect(alerts[0].severity).toBe('high')
    })

    it('should detect unusual access patterns', async () => {
      // Set up access to many different patients
      const accessLogs: AuditLogEntry[] = Array.from({ length: 35 }, (_, i) => ({
        id: `audit_${i}`,
        userId: testUserId,
        patientId: generateTestPatientId(i),
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date(Date.now() - (35 - i) * 60 * 1000) // Spread over time
      }))

      mockAuditLogger.setMockLogs(accessLogs)

      const auditEvent: AuditLogEntry = {
        id: 'audit_new',
        userId: testUserId,
        patientId: generateTestPatientId(100),
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date()
      }

      await securityService.processAuditEvent(auditEvent)

      // Check if unusual access pattern alert was created
      const alerts = await securityService.getSecurityAlerts({ type: 'unusual_access_pattern' })
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].type).toBe('unusual_access_pattern')
    })

    it('should detect potential data exfiltration', async () => {
      // Set up many read operations in short time
      const readLogs: AuditLogEntry[] = Array.from({ length: 55 }, (_, i) => ({
        id: `audit_${i}`,
        userId: testUserId,
        patientId: generateTestPatientId(i % 10),
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date(Date.now() - (55 - i) * 30 * 1000) // 30 seconds apart
      }))

      mockAuditLogger.setMockLogs(readLogs)

      const auditEvent: AuditLogEntry = {
        id: 'audit_new',
        userId: testUserId,
        patientId: testPatientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date()
      }

      await securityService.processAuditEvent(auditEvent)

      // Check if data exfiltration alert was created
      const alerts = await securityService.getSecurityAlerts({ type: 'data_exfiltration' })
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].type).toBe('data_exfiltration')
      expect(alerts[0].severity).toBe('critical')
    })
  })

  describe('createSecurityAlert', () => {
    it('should create security alert', async () => {
      const alertData = {
        type: 'unauthorized_access' as SecurityAlertType,
        severity: 'high' as const,
        title: 'Unauthorized Access Attempt',
        description: 'User attempted to access restricted data',
        affectedUsers: [testUserId],
        affectedPatients: [testPatientId],
        evidence: [],
        riskScore: 75
      }

      const alert = await securityService.createSecurityAlert(alertData)

      expect(alert.id).toBeDefined()
      expect(alert.detectedAt).toBeInstanceOf(Date)
      expect(alert.status).toBe('active')
      expect(alert.type).toBe('unauthorized_access')
      expect(alert.severity).toBe('high')
      expect(alert.title).toBe('Unauthorized Access Attempt')
    })

    it('should log alert creation', async () => {
      const logSpy = jest.spyOn(mockAuditLogger, 'logDataAccess')

      const alertData = {
        type: 'system_anomaly' as SecurityAlertType,
        severity: 'medium' as const,
        title: 'System Anomaly Detected',
        description: 'Unusual system behavior detected',
        affectedUsers: [],
        affectedPatients: [],
        evidence: [],
        riskScore: 50
      }

      await securityService.createSecurityAlert(alertData)

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create_security_alert',
          dataType: 'security',
          accessResult: 'granted'
        })
      )
    })

    it('should execute automatic response when configured', async () => {
      const alertData = {
        type: 'brute_force_attack' as SecurityAlertType,
        severity: 'critical' as const,
        title: 'Brute Force Attack',
        description: 'Multiple failed login attempts detected',
        affectedUsers: [testUserId],
        affectedPatients: [],
        evidence: [],
        riskScore: 90,
        automaticResponse: {
          type: 'block_user' as const,
          executed: false,
          details: 'Block user account'
        }
      }

      const alert = await securityService.createSecurityAlert(alertData)

      expect(alert.automaticResponse?.executed).toBe(true)
      expect(alert.automaticResponse?.executedAt).toBeInstanceOf(Date)
    })
  })

  describe('updateSecurityAlert', () => {
    it('should update alert status', async () => {
      const alertData = {
        type: 'unauthorized_access' as SecurityAlertType,
        severity: 'medium' as const,
        title: 'Test Alert',
        description: 'Test alert description',
        affectedUsers: [testUserId],
        affectedPatients: [],
        evidence: [],
        riskScore: 50
      }

      const alert = await securityService.createSecurityAlert(alertData)
      
      await securityService.updateSecurityAlert(
        alert.id,
        'investigating',
        testUserId,
        'Investigation started'
      )

      const updatedAlerts = await securityService.getSecurityAlerts({ status: 'investigating' })
      expect(updatedAlerts).toHaveLength(1)
      expect(updatedAlerts[0].status).toBe('investigating')
      expect(updatedAlerts[0].assignedTo).toBe(testUserId)
      expect(updatedAlerts[0].resolutionNotes).toBe('Investigation started')
    })

    it('should set resolved timestamp when status is resolved', async () => {
      const alertData = {
        type: 'system_anomaly' as SecurityAlertType,
        severity: 'low' as const,
        title: 'Test Alert',
        description: 'Test alert description',
        affectedUsers: [],
        affectedPatients: [],
        evidence: [],
        riskScore: 25
      }

      const alert = await securityService.createSecurityAlert(alertData)
      
      await securityService.updateSecurityAlert(
        alert.id,
        'resolved',
        testUserId,
        'False positive'
      )

      const resolvedAlerts = await securityService.getSecurityAlerts({ status: 'resolved' })
      expect(resolvedAlerts).toHaveLength(1)
      expect(resolvedAlerts[0].resolvedAt).toBeInstanceOf(Date)
    })

    it('should throw error for non-existent alert', async () => {
      await expect(
        securityService.updateSecurityAlert('non-existent', 'resolved')
      ).rejects.toThrow('Security alert not found: non-existent')
    })
  })

  describe('createSecurityIncident', () => {
    it('should create security incident from alert', async () => {
      const alertData = {
        type: 'data_exfiltration' as SecurityAlertType,
        severity: 'critical' as const,
        title: 'Data Exfiltration Alert',
        description: 'Potential data exfiltration detected',
        affectedUsers: [testUserId],
        affectedPatients: [testPatientId],
        evidence: [],
        riskScore: 95
      }

      const alert = await securityService.createSecurityAlert(alertData)
      
      const incident = await securityService.createSecurityIncident(
        alert.id,
        'High impact - potential data breach',
        ['User account suspended', 'Security team notified', 'Forensic analysis initiated']
      )

      expect(incident.id).toBeDefined()
      expect(incident.type).toBe('data_exfiltration')
      expect(incident.severity).toBe('critical')
      expect(incident.impactAssessment).toBe('High impact - potential data breach')
      expect(incident.responseActions).toHaveLength(3)
      expect(incident.affectedUsers).toContain(testUserId)
      expect(incident.affectedPatients).toContain(testPatientId)
    })

    it('should update alert status to investigating', async () => {
      const alertData = {
        type: 'privilege_escalation' as SecurityAlertType,
        severity: 'high' as const,
        title: 'Privilege Escalation',
        description: 'Unauthorized privilege escalation attempt',
        affectedUsers: [testUserId],
        affectedPatients: [],
        evidence: [],
        riskScore: 80
      }

      const alert = await securityService.createSecurityAlert(alertData)
      
      await securityService.createSecurityIncident(
        alert.id,
        'Medium impact',
        ['Investigation started']
      )

      const investigatingAlerts = await securityService.getSecurityAlerts({ status: 'investigating' })
      expect(investigatingAlerts).toHaveLength(1)
      expect(investigatingAlerts[0].id).toBe(alert.id)
    })

    it('should throw error for non-existent alert', async () => {
      await expect(
        securityService.createSecurityIncident('non-existent', 'Impact assessment', [])
      ).rejects.toThrow('Security alert not found: non-existent')
    })
  })

  describe('getSecurityAlerts', () => {
    beforeEach(async () => {
      // Create test alerts
      await securityService.createSecurityAlert({
        type: 'brute_force_attack',
        severity: 'high',
        title: 'Brute Force Attack',
        description: 'Multiple failed logins',
        affectedUsers: [testUserId],
        affectedPatients: [],
        evidence: [],
        riskScore: 80
      })

      await securityService.createSecurityAlert({
        type: 'unusual_access_pattern',
        severity: 'medium',
        title: 'Unusual Access',
        description: 'Unusual access pattern detected',
        affectedUsers: [new UserId('770e8400-e29b-41d4-a716-446655440002')],
        affectedPatients: [testPatientId],
        evidence: [],
        riskScore: 60
      })
    })

    it('should return all alerts without filters', async () => {
      const alerts = await securityService.getSecurityAlerts()
      expect(alerts).toHaveLength(2)
    })

    it('should filter alerts by status', async () => {
      const alerts = await securityService.getSecurityAlerts({ status: 'active' })
      expect(alerts).toHaveLength(2)
      expect(alerts.every(alert => alert.status === 'active')).toBe(true)
    })

    it('should filter alerts by severity', async () => {
      const alerts = await securityService.getSecurityAlerts({ severity: 'high' })
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('high')
    })

    it('should filter alerts by type', async () => {
      const alerts = await securityService.getSecurityAlerts({ type: 'brute_force_attack' })
      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('brute_force_attack')
    })

    it('should filter alerts by date range', async () => {
      const fromDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      const toDate = new Date()
      
      const alerts = await securityService.getSecurityAlerts({ fromDate, toDate })
      expect(alerts).toHaveLength(2)
    })

    it('should sort alerts by detection time (newest first)', async () => {
      const alerts = await securityService.getSecurityAlerts()
      
      for (let i = 1; i < alerts.length; i++) {
        expect(alerts[i - 1].detectedAt.getTime()).toBeGreaterThanOrEqual(alerts[i].detectedAt.getTime())
      }
    })
  })

  describe('generateSecurityDashboard', () => {
    beforeEach(async () => {
      // Create test alerts and incidents
      await securityService.createSecurityAlert({
        type: 'brute_force_attack',
        severity: 'critical',
        title: 'Critical Alert',
        description: 'Critical security alert',
        affectedUsers: [testUserId],
        affectedPatients: [],
        evidence: [],
        riskScore: 95
      })

      await securityService.createSecurityAlert({
        type: 'unusual_access_pattern',
        severity: 'medium',
        title: 'Medium Alert',
        description: 'Medium security alert',
        affectedUsers: [new UserId('770e8400-e29b-41d4-a716-446655440002')],
        affectedPatients: [testPatientId],
        evidence: [],
        riskScore: 50
      })

      // Set up mock anomalies
      mockReportingService.setMockAnomalies([
        {
          id: 'anomaly_1',
          type: 'unusual_access_pattern',
          severity: 'medium',
          description: 'Test anomaly',
          detectedAt: new Date(),
          affectedUsers: [testUserId],
          affectedPatients: [testPatientId],
          evidence: [],
          riskScore: 60
        }
      ])
    })

    it('should generate comprehensive security dashboard', async () => {
      const dashboard = await securityService.generateSecurityDashboard()

      expect(dashboard.overview).toBeDefined()
      expect(dashboard.overview.totalAlerts).toBe(2)
      expect(dashboard.overview.criticalAlerts).toBe(1)
      expect(dashboard.overview.activeThreats).toBe(2)
      expect(dashboard.overview.securityScore).toBeGreaterThanOrEqual(0)
      expect(dashboard.overview.securityScore).toBeLessThanOrEqual(100)

      expect(dashboard.activeAlerts).toHaveLength(2)
      expect(dashboard.activeAlerts[0].riskScore).toBeGreaterThanOrEqual(dashboard.activeAlerts[1].riskScore)

      expect(dashboard.threatLevel).toMatch(/^(low|medium|high|critical)$/)
      expect(dashboard.systemHealth).toBeDefined()
      expect(dashboard.complianceStatus).toBeDefined()
    })

    it('should calculate threat level based on active alerts', async () => {
      const dashboard = await securityService.generateSecurityDashboard()

      // Should be critical due to critical alert
      expect(dashboard.threatLevel).toBe('critical')
    })

    it('should include system health metrics', async () => {
      const dashboard = await securityService.generateSecurityDashboard()

      expect(dashboard.systemHealth.auditLogHealth).toMatch(/^(healthy|warning|critical)$/)
      expect(dashboard.systemHealth.authenticationHealth).toMatch(/^(healthy|warning|critical)$/)
      expect(dashboard.systemHealth.dataIntegrityHealth).toMatch(/^(healthy|warning|critical)$/)
      expect(dashboard.systemHealth.performanceHealth).toMatch(/^(healthy|warning|critical)$/)
      expect(dashboard.systemHealth.lastHealthCheck).toBeInstanceOf(Date)
    })

    it('should include compliance status', async () => {
      const dashboard = await securityService.generateSecurityDashboard()

      expect(dashboard.complianceStatus.lgpdCompliance).toMatch(/^(compliant|warning|violation)$/)
      expect(dashboard.complianceStatus.auditCompliance).toMatch(/^(compliant|warning|violation)$/)
      expect(dashboard.complianceStatus.accessControlCompliance).toMatch(/^(compliant|warning|violation)$/)
      expect(dashboard.complianceStatus.dataRetentionCompliance).toMatch(/^(compliant|warning|violation)$/)
      expect(dashboard.complianceStatus.lastComplianceCheck).toBeInstanceOf(Date)
    })
  })

  describe('addSecurityRule', () => {
    it('should add custom security rule', async () => {
      const ruleData = {
        name: 'Custom Rule',
        description: 'Custom security rule for testing',
        enabled: true,
        severity: 'medium' as const,
        conditions: [
          {
            field: 'operation',
            operator: 'equals' as const,
            value: 'suspicious_operation'
          }
        ],
        actions: [
          {
            type: 'alert' as const,
            parameters: { severity: 'medium' }
          }
        ]
      }

      const rule = await securityService.addSecurityRule(ruleData)

      expect(rule.id).toBeDefined()
      expect(rule.name).toBe('Custom Rule')
      expect(rule.enabled).toBe(true)
      expect(rule.createdAt).toBeInstanceOf(Date)
      expect(rule.updatedAt).toBeInstanceOf(Date)
    })

    it('should log security rule creation', async () => {
      const logSpy = jest.spyOn(mockAuditLogger, 'logDataAccess')

      const ruleData = {
        name: 'Test Rule',
        description: 'Test security rule',
        enabled: true,
        severity: 'low' as const,
        conditions: [],
        actions: []
      }

      await securityService.addSecurityRule(ruleData)

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create_security_rule',
          dataType: 'security',
          accessResult: 'granted'
        })
      )
    })
  })
})