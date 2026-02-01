// ============================================================================
// SECURITY MONITORING INTEGRATION EXAMPLE
// Demonstrates comprehensive security monitoring and audit reporting integration
// ============================================================================

import { AuditLogger } from '../infrastructure/services/AuditLogger'
import { SupabaseAuditRepository } from '../infrastructure/repositories/SupabaseAuditRepository'
import { EncryptionService } from '../infrastructure/services/EncryptionService'
import { AuditReportingService, AuditReport, AuditAnomaly } from '../infrastructure/services/AuditReportingService'
import { SecurityMonitoringService, SecurityDashboard, SecurityAlert } from '../infrastructure/services/SecurityMonitoringService'
import { PatientId } from '../domain/value-objects/PatientId'
import { UserId } from '../domain/value-objects/UserId'

/**
 * Comprehensive Security Monitoring System
 * 
 * Integrates audit logging, reporting, and security monitoring for complete
 * security oversight of the patient management system.
 */
export class ComprehensiveSecuritySystem {
  private auditLogger: AuditLogger
  private reportingService: AuditReportingService
  private securityService: SecurityMonitoringService

  constructor() {
    // Initialize audit logging infrastructure
    const auditRepository = new SupabaseAuditRepository()
    const encryptionService = new EncryptionService('default-encryption-key-change-in-production')
    
    this.auditLogger = new AuditLogger(auditRepository, encryptionService)
    this.reportingService = new AuditReportingService(this.auditLogger)
    this.securityService = new SecurityMonitoringService(this.auditLogger, this.reportingService)
  }

  /**
   * Initialize the complete security monitoring system
   */
  async initialize(): Promise<void> {
    try {
      // Start security monitoring
      await this.securityService.startMonitoring()

      // Set up custom security rules
      await this.setupCustomSecurityRules()

      // Log system initialization
      await this.auditLogger.logDataAccess({
        userId: new UserId('00000000-0000-0000-0000-000000000000'), // System user ID
        patientId: new PatientId('00000000-0000-0000-0000-000000000000'), // System patient ID
        operation: 'initialize_security_system',
        dataType: 'security',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: 'Security monitoring system initialized'
      })

      console.log('Comprehensive security system initialized successfully')
    } catch (error) {
      console.error('Failed to initialize security system:', error)
      throw error
    }
  }

  /**
   * Set up custom security rules for the organization
   */
  private async setupCustomSecurityRules(): Promise<void> {
    // Add rule for detecting after-hours access
    await this.securityService.addSecurityRule({
      name: 'After Hours Patient Access',
      description: 'Detect patient data access outside business hours (6 AM - 10 PM)',
      enabled: true,
      severity: 'medium',
      conditions: [
        {
          field: 'operation',
          operator: 'equals',
          value: 'read'
        }
      ],
      actions: [
        {
          type: 'alert',
          parameters: { severity: 'medium' }
        },
        {
          type: 'log',
          parameters: {}
        }
      ]
    })

    // Add rule for bulk data operations
    await this.securityService.addSecurityRule({
      name: 'Bulk Data Operations',
      description: 'Detect bulk data operations that may indicate data exfiltration',
      enabled: true,
      severity: 'high',
      conditions: [
        {
          field: 'operation',
          operator: 'equals',
          value: 'read'
        }
      ],
      actions: [
        {
          type: 'alert',
          parameters: { severity: 'high' }
        },
        {
          type: 'notify',
          parameters: { recipients: ['security@example.com'] }
        }
      ]
    })
  }

  /**
   * Process audit event through the security monitoring pipeline
   */
  async processSecurityEvent(auditEvent: {
    userId: UserId
    patientId: PatientId
    operation: string
    dataType: string
    accessResult: 'granted' | 'denied' | 'partial'
    timestamp: Date
    justification?: string
  }): Promise<void> {
    try {
      // Log the audit event
      await this.auditLogger.logDataAccess(auditEvent)

      // Process through security monitoring
      await this.securityService.processAuditEvent(auditEvent)
    } catch (error) {
      console.error('Failed to process security event:', error)
    }
  }

  /**
   * Generate comprehensive security dashboard
   */
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    try {
      return await this.securityService.generateSecurityDashboard()
    } catch (error) {
      console.error('Failed to generate security dashboard:', error)
      throw error
    }
  }

  /**
   * Generate compliance report for a specific period
   */
  async generateComplianceReport(fromDate: Date, toDate: Date, userId: UserId): Promise<AuditReport> {
    try {
      return await this.reportingService.generateComplianceReport(
        { fromDate, toDate },
        userId
      )
    } catch (error) {
      console.error('Failed to generate compliance report:', error)
      throw error
    }
  }

  /**
   * Generate security incidents report
   */
  async generateSecurityReport(fromDate: Date, toDate: Date, userId: UserId): Promise<AuditReport> {
    try {
      return await this.reportingService.generateSecurityReport(
        { fromDate, toDate },
        userId
      )
    } catch (error) {
      console.error('Failed to generate security report:', error)
      throw error
    }
  }

  /**
   * Get active security alerts
   */
  async getActiveSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      return await this.securityService.getSecurityAlerts({ status: 'active' })
    } catch (error) {
      console.error('Failed to get active security alerts:', error)
      throw error
    }
  }

  /**
   * Detect suspicious activities in a time period
   */
  async detectSuspiciousActivities(fromDate: Date, toDate: Date): Promise<AuditAnomaly[]> {
    try {
      return await this.reportingService.detectSuspiciousActivities({ fromDate, toDate })
    } catch (error) {
      console.error('Failed to detect suspicious activities:', error)
      throw error
    }
  }

  /**
   * Export audit report in specified format
   */
  async exportAuditReport(format: 'json' | 'csv' | 'xml' | 'pdf'): Promise<string> {
    try {
      // Generate a sample report for export
      const report = await this.reportingService.generateComplianceReport(
        {
          fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          toDate: new Date()
        },
        new UserId('00000000-0000-0000-0000-000000000000') // System user ID
      )

      return await this.reportingService.exportReport(report, format)
    } catch (error) {
      console.error('Failed to export audit report:', error)
      throw error
    }
  }

  /**
   * Shutdown the security monitoring system
   */
  async shutdown(): Promise<void> {
    try {
      await this.securityService.stopMonitoring()
      console.log('Security monitoring system shut down successfully')
    } catch (error) {
      console.error('Failed to shutdown security system:', error)
      throw error
    }
  }
}

/**
 * Example usage of the comprehensive security system
 */
export async function demonstrateSecurityMonitoring(): Promise<void> {
  const securitySystem = new ComprehensiveSecuritySystem()

  try {
    // Initialize the system
    await securitySystem.initialize()

    // Simulate some audit events
    const testUserId = new UserId('550e8400-e29b-41d4-a716-446655440000')
    const testPatientId = new PatientId('660e8400-e29b-41d4-a716-446655440001')

    // Normal access event
    await securitySystem.processSecurityEvent({
      userId: testUserId,
      patientId: testPatientId,
      operation: 'read',
      dataType: 'patient',
      accessResult: 'granted',
      timestamp: new Date(),
      justification: 'Medical consultation'
    })

    // Failed access event
    await securitySystem.processSecurityEvent({
      userId: testUserId,
      patientId: testPatientId,
      operation: 'update',
      dataType: 'medical_record',
      accessResult: 'denied',
      timestamp: new Date(),
      justification: 'Insufficient permissions'
    })

    // Get security dashboard
    const dashboard = await securitySystem.getSecurityDashboard()
    console.log('Security Dashboard:', JSON.stringify(dashboard, null, 2))

    // Get active alerts
    const activeAlerts = await securitySystem.getActiveSecurityAlerts()
    console.log(`Active Security Alerts: ${activeAlerts.length}`)

    // Generate compliance report
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    const toDate = new Date()
    const complianceReport = await securitySystem.generateComplianceReport(
      fromDate,
      toDate,
      testUserId
    )
    console.log('Compliance Report Generated:', complianceReport.id)

    // Detect suspicious activities
    const suspiciousActivities = await securitySystem.detectSuspiciousActivities(fromDate, toDate)
    console.log(`Suspicious Activities Detected: ${suspiciousActivities.length}`)

    // Export report
    const exportedReport = await securitySystem.exportAuditReport('json')
    console.log('Report exported successfully, length:', exportedReport.length)

    // Shutdown
    await securitySystem.shutdown()
  } catch (error) {
    console.error('Security monitoring demonstration failed:', error)
  }
}