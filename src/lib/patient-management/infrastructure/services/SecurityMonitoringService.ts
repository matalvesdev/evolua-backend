// ============================================================================
// SECURITY MONITORING SERVICE
// Real-time security monitoring and alerting for the patient management system
// ============================================================================

import { AuditLogger, AuditLogEntry } from './AuditLogger'
import { AuditReportingService, AuditAnomaly } from './AuditReportingService'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'

export interface SecurityAlert {
  id: string
  type: SecurityAlertType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  detectedAt: Date
  affectedUsers: UserId[]
  affectedPatients: PatientId[]
  evidence: AuditLogEntry[]
  riskScore: number
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  assignedTo?: UserId
  resolvedAt?: Date
  resolutionNotes?: string
  automaticResponse?: SecurityResponse
}

export type SecurityAlertType = 
  | 'brute_force_attack'
  | 'unusual_access_pattern'
  | 'data_exfiltration'
  | 'privilege_escalation'
  | 'unauthorized_access'
  | 'suspicious_bulk_operations'
  | 'off_hours_activity'
  | 'failed_authentication'
  | 'data_integrity_violation'
  | 'lgpd_compliance_violation'
  | 'system_anomaly'

export interface SecurityResponse {
  type: 'block_user' | 'require_mfa' | 'log_only' | 'notify_admin' | 'escalate'
  executed: boolean
  executedAt?: Date
  details: string
}

export interface SecurityDashboard {
  overview: SecurityOverview
  activeAlerts: SecurityAlert[]
  recentIncidents: SecurityIncident[]
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  systemHealth: SystemHealthMetrics
  complianceStatus: ComplianceStatus
}

export interface SecurityOverview {
  totalAlerts: number
  criticalAlerts: number
  activeThreats: number
  resolvedIncidents: number
  averageResponseTime: number // in minutes
  securityScore: number // 0-100
}

export interface SecurityIncident {
  id: string
  type: SecurityAlertType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  occurredAt: Date
  detectedAt: Date
  resolvedAt?: Date
  affectedUsers: UserId[]
  affectedPatients: PatientId[]
  impactAssessment: string
  responseActions: string[]
  lessonsLearned?: string
}

export interface SystemHealthMetrics {
  auditLogHealth: 'healthy' | 'warning' | 'critical'
  authenticationHealth: 'healthy' | 'warning' | 'critical'
  dataIntegrityHealth: 'healthy' | 'warning' | 'critical'
  performanceHealth: 'healthy' | 'warning' | 'critical'
  lastHealthCheck: Date
}

export interface ComplianceStatus {
  lgpdCompliance: 'compliant' | 'warning' | 'violation'
  auditCompliance: 'compliant' | 'warning' | 'violation'
  accessControlCompliance: 'compliant' | 'warning' | 'violation'
  dataRetentionCompliance: 'compliant' | 'warning' | 'violation'
  lastComplianceCheck: Date
}

export interface SecurityRule {
  id: string
  name: string
  description: string
  enabled: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  conditions: SecurityRuleCondition[]
  actions: SecurityRuleAction[]
  createdAt: Date
  updatedAt: Date
}

export interface SecurityRuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains'
  value: any
  timeWindow?: number // in minutes
}

export interface SecurityRuleAction {
  type: 'alert' | 'block' | 'log' | 'notify' | 'escalate'
  parameters: Record<string, any>
}

/**
 * Security Monitoring Service
 * 
 * Provides real-time security monitoring, threat detection, and incident response
 * capabilities for the patient management system.
 * 
 * Requirements: 8.6
 */
export class SecurityMonitoringService {
  private alerts: Map<string, SecurityAlert> = new Map()
  private incidents: Map<string, SecurityIncident> = new Map()
  private securityRules: Map<string, SecurityRule> = new Map()
  private monitoringEnabled = true

  constructor(
    private readonly auditLogger: AuditLogger,
    private readonly reportingService: AuditReportingService
  ) {
    this.initializeDefaultSecurityRules()
  }

  /**
   * Start real-time security monitoring
   * @returns Promise resolving when monitoring is started
   */
  async startMonitoring(): Promise<void> {
    this.monitoringEnabled = true
    
    // Log monitoring start
    await this.auditLogger.logDataAccess({
      userId: new UserId('00000000-0000-4000-8000-000000000000'), // System user ID
      patientId: new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
      operation: 'start_security_monitoring',
      dataType: 'security',
      accessResult: 'granted',
      timestamp: new Date(),
      justification: 'Security monitoring service started'
    })

    // Start periodic monitoring tasks
    this.startPeriodicTasks()
  }

  /**
   * Stop security monitoring
   * @returns Promise resolving when monitoring is stopped
   */
  async stopMonitoring(): Promise<void> {
    this.monitoringEnabled = false
    
    await this.auditLogger.logDataAccess({
      userId: new UserId('00000000-0000-4000-8000-000000000000'), // System user ID
      patientId: new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
      operation: 'stop_security_monitoring',
      dataType: 'security',
      accessResult: 'granted',
      timestamp: new Date(),
      justification: 'Security monitoring service stopped'
    })
  }

  /**
   * Process audit event for security monitoring
   * @param auditEvent - Audit event to analyze
   * @returns Promise resolving when event is processed
   */
  async processAuditEvent(auditEvent: AuditLogEntry): Promise<void> {
    if (!this.monitoringEnabled) return

    try {
      // Check against security rules
      const triggeredRules = await this.evaluateSecurityRules(auditEvent)
      
      // Generate alerts for triggered rules
      for (const rule of triggeredRules) {
        await this.generateSecurityAlert(rule, auditEvent)
      }

      // Perform real-time threat detection
      await this.performThreatDetection(auditEvent)
    } catch (error) {
      console.error('Security monitoring error:', error)
    }
  }

  /**
   * Generate security dashboard
   * @returns Promise resolving to security dashboard data
   */
  async generateSecurityDashboard(): Promise<SecurityDashboard> {
    try {
      const overview = await this.generateSecurityOverview()
      const activeAlerts = Array.from(this.alerts.values())
        .filter(alert => alert.status === 'active')
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 10)

      const recentIncidents = Array.from(this.incidents.values())
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .slice(0, 10)

      const threatLevel = this.calculateThreatLevel()
      const systemHealth = await this.assessSystemHealth()
      const complianceStatus = await this.assessComplianceStatus()

      return {
        overview,
        activeAlerts,
        recentIncidents,
        threatLevel,
        systemHealth,
        complianceStatus
      }
    } catch (error) {
      throw new Error(`Security dashboard generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create security alert
   * @param alertData - Alert data
   * @returns Promise resolving to created alert
   */
  async createSecurityAlert(alertData: Omit<SecurityAlert, 'id' | 'detectedAt' | 'status'>): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      ...alertData,
      id: this.generateAlertId(),
      detectedAt: new Date(),
      status: 'active'
    }

    this.alerts.set(alert.id, alert)

    // Log alert creation
    await this.auditLogger.logDataAccess({
      userId: new UserId('00000000-0000-4000-8000-000000000000'), // System user ID
      patientId: new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
      operation: 'create_security_alert',
      dataType: 'security',
      accessResult: 'granted',
      timestamp: new Date(),
      newValues: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title
      },
      justification: 'Security alert created'
    })

    // Execute automatic response if configured
    if (alert.automaticResponse) {
      await this.executeAutomaticResponse(alert)
    }

    return alert
  }

  /**
   * Update security alert status
   * @param alertId - Alert ID
   * @param status - New status
   * @param assignedTo - User assigned to handle the alert
   * @param notes - Resolution notes
   * @returns Promise resolving when alert is updated
   */
  async updateSecurityAlert(
    alertId: string,
    status: SecurityAlert['status'],
    assignedTo?: UserId,
    notes?: string
  ): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      throw new Error(`Security alert not found: ${alertId}`)
    }

    const oldStatus = alert.status
    alert.status = status
    alert.assignedTo = assignedTo
    alert.resolutionNotes = notes

    if (status === 'resolved') {
      alert.resolvedAt = new Date()
    }

    // Log alert update
    await this.auditLogger.logDataModification(
      assignedTo || new UserId('00000000-0000-4000-8000-000000000000'), // System user ID if no assignee
      new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
      'update',
      'security_alert',
      { status: oldStatus },
      { status, assignedTo, notes },
      'Security alert status updated'
    )
  }

  /**
   * Create security incident from alert
   * @param alertId - Alert ID to escalate
   * @param impactAssessment - Impact assessment
   * @param responseActions - Response actions taken
   * @returns Promise resolving to created incident
   */
  async createSecurityIncident(
    alertId: string,
    impactAssessment: string,
    responseActions: string[]
  ): Promise<SecurityIncident> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      throw new Error(`Security alert not found: ${alertId}`)
    }

    const incident: SecurityIncident = {
      id: this.generateIncidentId(),
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      occurredAt: alert.detectedAt,
      detectedAt: alert.detectedAt,
      affectedUsers: alert.affectedUsers,
      affectedPatients: alert.affectedPatients,
      impactAssessment,
      responseActions
    }

    this.incidents.set(incident.id, incident)

    // Update alert to investigating status
    await this.updateSecurityAlert(alertId, 'investigating')

    // Log incident creation
    await this.auditLogger.logDataAccess({
      userId: new UserId('00000000-0000-4000-8000-000000000000'), // System user ID
      patientId: new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
      operation: 'create_security_incident',
      dataType: 'security',
      accessResult: 'granted',
      timestamp: new Date(),
      newValues: {
        incidentId: incident.id,
        alertId,
        type: incident.type,
        severity: incident.severity
      },
      justification: 'Security incident created from alert'
    })

    return incident
  }

  /**
   * Get security alerts with filtering
   * @param filters - Alert filters
   * @returns Promise resolving to filtered alerts
   */
  async getSecurityAlerts(filters?: {
    status?: SecurityAlert['status']
    severity?: SecurityAlert['severity']
    type?: SecurityAlertType
    fromDate?: Date
    toDate?: Date
  }): Promise<SecurityAlert[]> {
    let alerts = Array.from(this.alerts.values())

    if (filters) {
      if (filters.status) {
        alerts = alerts.filter(alert => alert.status === filters.status)
      }
      if (filters.severity) {
        alerts = alerts.filter(alert => alert.severity === filters.severity)
      }
      if (filters.type) {
        alerts = alerts.filter(alert => alert.type === filters.type)
      }
      if (filters.fromDate) {
        alerts = alerts.filter(alert => alert.detectedAt >= filters.fromDate!)
      }
      if (filters.toDate) {
        alerts = alerts.filter(alert => alert.detectedAt <= filters.toDate!)
      }
    }

    return alerts.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }

  /**
   * Add custom security rule
   * @param rule - Security rule to add
   * @returns Promise resolving when rule is added
   */
  async addSecurityRule(rule: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityRule> {
    const securityRule: SecurityRule = {
      ...rule,
      id: this.generateRuleId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.securityRules.set(securityRule.id, securityRule)

    await this.auditLogger.logDataAccess({
      userId: new UserId('00000000-0000-4000-8000-000000000000'), // System user ID
      patientId: new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
      operation: 'create_security_rule',
      dataType: 'security',
      accessResult: 'granted',
      timestamp: new Date(),
      newValues: securityRule,
      justification: 'Security rule created'
    })

    return securityRule
  }

  // Private helper methods

  private async evaluateSecurityRules(auditEvent: AuditLogEntry): Promise<SecurityRule[]> {
    const triggeredRules: SecurityRule[] = []

    for (const rule of this.securityRules.values()) {
      if (!rule.enabled) continue

      const isTriggered = rule.conditions.every(condition => 
        this.evaluateCondition(condition, auditEvent)
      )

      if (isTriggered) {
        triggeredRules.push(rule)
      }
    }

    return triggeredRules
  }

  private evaluateCondition(condition: SecurityRuleCondition, auditEvent: AuditLogEntry): boolean {
    const fieldValue = this.getFieldValue(condition.field, auditEvent)
    
    switch (condition.operator) {
      case 'equals':
        return String(fieldValue) === String(condition.value)
      case 'not_equals':
        return String(fieldValue) !== String(condition.value)
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value)
      case 'less_than':
        return Number(fieldValue) < Number(condition.value)
      case 'contains':
        return String(fieldValue).includes(String(condition.value))
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value))
      default:
        return false
    }
  }

  private getFieldValue(field: string, auditEvent: AuditLogEntry): string | Date | undefined {
    const fieldMap: Record<string, string | Date | undefined> = {
      'userId': auditEvent.userId.value || auditEvent.userId.toString(),
      'patientId': auditEvent.patientId.value || auditEvent.patientId.toString(),
      'operation': auditEvent.operation,
      'dataType': auditEvent.dataType,
      'accessResult': auditEvent.accessResult,
      'timestamp': auditEvent.timestamp,
      'ipAddress': auditEvent.ipAddress,
      'userAgent': auditEvent.userAgent
    }

    return fieldMap[field]
  }

  private async generateSecurityAlert(rule: SecurityRule, auditEvent: AuditLogEntry): Promise<void> {
    const alert: Omit<SecurityAlert, 'id' | 'detectedAt' | 'status'> = {
      type: this.mapRuleToAlertType(rule),
      severity: rule.severity,
      title: `Security Rule Triggered: ${rule.name}`,
      description: `Security rule "${rule.name}" was triggered by audit event`,
      affectedUsers: [auditEvent.userId],
      affectedPatients: auditEvent.patientId !== 'system' ? [auditEvent.patientId] : [],
      evidence: [auditEvent],
      riskScore: this.calculateRiskScore(rule.severity),
      automaticResponse: this.determineAutomaticResponse(rule)
    }

    await this.createSecurityAlert(alert)
  }

  private async performThreatDetection(auditEvent: AuditLogEntry): Promise<void> {
    // Detect brute force attacks
    if (auditEvent.accessResult === 'denied' && auditEvent.operation === 'failed_login') {
      await this.detectBruteForceAttack(auditEvent)
    }

    // Detect unusual access patterns
    if (auditEvent.accessResult === 'granted' && auditEvent.patientId !== 'system') {
      await this.detectUnusualAccessPattern(auditEvent)
    }

    // Detect data exfiltration attempts
    if (auditEvent.operation === 'read' && auditEvent.accessResult === 'granted') {
      await this.detectDataExfiltration(auditEvent)
    }
  }

  private async detectBruteForceAttack(auditEvent: AuditLogEntry): Promise<void> {
    const systemPatientId = '00000000-0000-4000-8000-000000000000'
    // Get recent failed login attempts for this user
    const recentFailures = await this.auditLogger.queryAuditLogs({
      userId: auditEvent.userId,
      operation: 'failed_login',
      accessResult: 'denied',
      fromDate: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    })

    if (recentFailures.length >= 5) {
      const patientIdValue = auditEvent.patientId.value || auditEvent.patientId.toString()
      const affectedPatients = patientIdValue !== systemPatientId ? [auditEvent.patientId] : []
      
      await this.createSecurityAlert({
        type: 'brute_force_attack',
        severity: 'high',
        title: 'Brute Force Attack Detected',
        description: `User ${auditEvent.userId} has ${recentFailures.length} failed login attempts in the last 15 minutes`,
        affectedUsers: [auditEvent.userId],
        affectedPatients,
        evidence: recentFailures,
        riskScore: 80,
        automaticResponse: {
          type: 'block_user',
          executed: false,
          details: 'Temporarily block user account'
        }
      })
    }
  }

  private async detectUnusualAccessPattern(auditEvent: AuditLogEntry): Promise<void> {
    const systemPatientId = '00000000-0000-4000-8000-000000000000'
    // Get user's access pattern for the last 24 hours
    const recentAccesses = await this.auditLogger.queryAuditLogs({
      userId: auditEvent.userId,
      fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    })

    const uniquePatientIds = new Set(
      recentAccesses
        .map(e => e.patientId.value || e.patientId.toString())
        .filter(p => p !== systemPatientId)
    )
    
    if (uniquePatientIds.size > 30) { // Threshold for unusual access
      const affectedPatients = Array.from(uniquePatientIds).map(id => new PatientId(id))
      await this.createSecurityAlert({
        type: 'unusual_access_pattern',
        severity: 'medium',
        title: 'Unusual Access Pattern Detected',
        description: `User ${auditEvent.userId} accessed ${uniquePatientIds.size} different patients in 24 hours`,
        affectedUsers: [auditEvent.userId],
        affectedPatients,
        evidence: recentAccesses,
        riskScore: 60,
        automaticResponse: {
          type: 'notify_admin',
          executed: false,
          details: 'Notify security administrator'
        }
      })
    }
  }

  private async detectDataExfiltration(auditEvent: AuditLogEntry): Promise<void> {
    const systemPatientId = '00000000-0000-4000-8000-000000000000'
    // Get bulk read operations in the last hour
    const recentReads = await this.auditLogger.queryAuditLogs({
      userId: auditEvent.userId,
      operation: 'read',
      fromDate: new Date(Date.now() - 60 * 60 * 1000) // Last hour
    })

    if (recentReads.length > 50) { // Threshold for potential data exfiltration
      const uniquePatientIds = new Set(
        recentReads
          .map(e => e.patientId.value || e.patientId.toString())
          .filter(p => p !== systemPatientId)
      )
      const affectedPatients = Array.from(uniquePatientIds).map(id => new PatientId(id))
      
      await this.createSecurityAlert({
        type: 'data_exfiltration',
        severity: 'critical',
        title: 'Potential Data Exfiltration Detected',
        description: `User ${auditEvent.userId} performed ${recentReads.length} read operations in the last hour`,
        affectedUsers: [auditEvent.userId],
        affectedPatients,
        evidence: recentReads,
        riskScore: 95,
        automaticResponse: {
          type: 'block_user',
          executed: false,
          details: 'Immediately block user and escalate to security team'
        }
      })
    }
  }

  private async executeAutomaticResponse(alert: SecurityAlert): Promise<void> {
    if (!alert.automaticResponse) return

    try {
      switch (alert.automaticResponse.type) {
        case 'block_user':
          // Implementation would block the user account
          console.log(`Blocking user: ${alert.affectedUsers[0]}`)
          break
        
        case 'require_mfa':
          // Implementation would require MFA for the user
          console.log(`Requiring MFA for user: ${alert.affectedUsers[0]}`)
          break
        
        case 'notify_admin':
          // Implementation would send notification to administrators
          console.log(`Notifying administrators about alert: ${alert.id}`)
          break
        
        case 'escalate':
          // Implementation would escalate to security incident
          await this.createSecurityIncident(alert.id, 'Automatic escalation', ['Alert auto-escalated'])
          break
      }

      alert.automaticResponse.executed = true
      alert.automaticResponse.executedAt = new Date()
    } catch (error) {
      console.error('Automatic response execution failed:', error)
    }
  }

  private async generateSecurityOverview(): Promise<SecurityOverview> {
    const alerts = Array.from(this.alerts.values())
    const incidents = Array.from(this.incidents.values())

    return {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      activeThreats: alerts.filter(a => a.status === 'active').length,
      resolvedIncidents: incidents.filter(i => i.resolvedAt).length,
      averageResponseTime: this.calculateAverageResponseTime(alerts),
      securityScore: this.calculateSecurityScore(alerts, incidents)
    }
  }

  private calculateThreatLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const activeAlerts = Array.from(this.alerts.values()).filter(a => a.status === 'active')
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length

    if (criticalAlerts > 0) return 'critical'
    if (highAlerts > 2) return 'high'
    if (activeAlerts.length > 5) return 'medium'
    return 'low'
  }

  private async assessSystemHealth(): Promise<SystemHealthMetrics> {
    // This would typically check various system components
    return {
      auditLogHealth: 'healthy',
      authenticationHealth: 'healthy',
      dataIntegrityHealth: 'healthy',
      performanceHealth: 'healthy',
      lastHealthCheck: new Date()
    }
  }

  private async assessComplianceStatus(): Promise<ComplianceStatus> {
    // This would typically check compliance metrics
    return {
      lgpdCompliance: 'compliant',
      auditCompliance: 'compliant',
      accessControlCompliance: 'compliant',
      dataRetentionCompliance: 'compliant',
      lastComplianceCheck: new Date()
    }
  }

  private initializeDefaultSecurityRules(): void {
    // Add default security rules
    const defaultRules: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Multiple Failed Logins',
        description: 'Detect multiple failed login attempts',
        enabled: true,
        severity: 'high',
        conditions: [
          { field: 'operation', operator: 'equals', value: 'failed_login' },
          { field: 'accessResult', operator: 'equals', value: 'denied' }
        ],
        actions: [
          { type: 'alert', parameters: { severity: 'high' } },
          { type: 'block', parameters: { duration: 900 } } // 15 minutes
        ]
      },
      {
        name: 'Off Hours Access',
        description: 'Detect access outside business hours',
        enabled: true,
        severity: 'medium',
        conditions: [
          { field: 'timestamp', operator: 'less_than', value: 6 }, // Before 6 AM
          { field: 'timestamp', operator: 'greater_than', value: 22 } // After 10 PM
        ],
        actions: [
          { type: 'alert', parameters: { severity: 'medium' } },
          { type: 'log', parameters: {} }
        ]
      }
    ]

    defaultRules.forEach(rule => {
      const securityRule: SecurityRule = {
        ...rule,
        id: this.generateRuleId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      this.securityRules.set(securityRule.id, securityRule)
    })
  }

  private startPeriodicTasks(): void {
    // Start periodic monitoring tasks
    setInterval(() => {
      if (this.monitoringEnabled) {
        this.performPeriodicSecurityCheck()
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private async performPeriodicSecurityCheck(): Promise<void> {
    try {
      // Check for anomalies in the last hour
      const anomalies = await this.reportingService.detectSuspiciousActivities({
        fromDate: new Date(Date.now() - 60 * 60 * 1000),
        toDate: new Date()
      })

      // Create alerts for new anomalies
      for (const anomaly of anomalies) {
        const existingAlert = Array.from(this.alerts.values()).find(
          alert => alert.type === anomaly.type && 
          alert.affectedUsers.some(user => anomaly.affectedUsers.includes(user))
        )

        if (!existingAlert) {
          await this.createSecurityAlert({
            type: anomaly.type as SecurityAlertType,
            severity: anomaly.severity,
            title: `Anomaly Detected: ${anomaly.type}`,
            description: anomaly.description,
            affectedUsers: anomaly.affectedUsers,
            affectedPatients: anomaly.affectedPatients,
            evidence: anomaly.evidence,
            riskScore: anomaly.riskScore
          })
        }
      }
    } catch (error) {
      console.error('Periodic security check failed:', error)
    }
  }

  private mapRuleToAlertType(rule: SecurityRule): SecurityAlertType {
    // Map rule names to alert types
    const typeMap: Record<string, SecurityAlertType> = {
      'Multiple Failed Logins': 'brute_force_attack',
      'Off Hours Access': 'off_hours_activity',
      'Bulk Operations': 'suspicious_bulk_operations',
      'Privilege Escalation': 'privilege_escalation'
    }

    return typeMap[rule.name] || 'system_anomaly'
  }

  private calculateRiskScore(severity: string): number {
    const scoreMap = {
      'low': 25,
      'medium': 50,
      'high': 75,
      'critical': 95
    }
    return scoreMap[severity as keyof typeof scoreMap] || 50
  }

  private determineAutomaticResponse(rule: SecurityRule): SecurityResponse | undefined {
    const blockActions = rule.actions.filter(action => action.type === 'block')
    if (blockActions.length > 0) {
      return {
        type: 'block_user',
        executed: false,
        details: 'Automatic user blocking based on security rule'
      }
    }

    const alertActions = rule.actions.filter(action => action.type === 'alert')
    if (alertActions.length > 0 && rule.severity === 'critical') {
      return {
        type: 'escalate',
        executed: false,
        details: 'Automatic escalation for critical security rule'
      }
    }

    return undefined
  }

  private calculateAverageResponseTime(alerts: SecurityAlert[]): number {
    const resolvedAlerts = alerts.filter(a => a.resolvedAt && a.detectedAt)
    if (resolvedAlerts.length === 0) return 0

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      const responseTime = alert.resolvedAt!.getTime() - alert.detectedAt.getTime()
      return sum + responseTime
    }, 0)

    return Math.round(totalTime / resolvedAlerts.length / (1000 * 60)) // Convert to minutes
  }

  private calculateSecurityScore(alerts: SecurityAlert[], incidents: SecurityIncident[]): number {
    let score = 100

    // Deduct for active alerts
    const activeAlerts = alerts.filter(a => a.status === 'active')
    score -= activeAlerts.length * 5

    // Deduct more for critical alerts
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical')
    score -= criticalAlerts.length * 15

    // Deduct for recent incidents
    const recentIncidents = incidents.filter(i => 
      i.occurredAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    )
    score -= recentIncidents.length * 10

    return Math.max(0, score)
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}