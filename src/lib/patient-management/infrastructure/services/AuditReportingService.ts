// ============================================================================
// AUDIT REPORTING SERVICE
// Comprehensive audit reporting and analytics for compliance and security monitoring
// ============================================================================

import { AuditLogger, AuditLogEntry, AuditQuery, AuditStatistics } from './AuditLogger'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'

export interface AuditReport {
  id: string
  title: string
  description: string
  generatedAt: Date
  generatedBy: UserId
  reportType: AuditReportType
  dateRange: {
    fromDate: Date
    toDate: Date
  }
  filters: AuditReportFilters
  data: AuditReportData
  summary: AuditReportSummary
  recommendations: string[]
}

export type AuditReportType = 
  | 'compliance_summary'
  | 'security_incidents'
  | 'user_activity'
  | 'patient_access'
  | 'data_modifications'
  | 'lgpd_compliance'
  | 'system_performance'
  | 'suspicious_activities'

export interface AuditReportFilters {
  userIds?: UserId[]
  patientIds?: PatientId[]
  operations?: string[]
  dataTypes?: string[]
  accessResults?: ('granted' | 'denied' | 'partial')[]
  includeSystemEvents?: boolean
  severityLevel?: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditReportData {
  totalEvents: number
  events: AuditLogEntry[]
  statistics: AuditStatistics
  trends: AuditTrend[]
  anomalies: AuditAnomaly[]
  complianceMetrics: ComplianceMetrics
}

export interface AuditReportSummary {
  keyFindings: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  complianceScore: number // 0-100
  securityScore: number // 0-100
  totalViolations: number
  criticalIssues: number
}

export interface AuditTrend {
  period: string
  metric: string
  value: number
  change: number
  changePercentage: number
}

export interface AuditAnomaly {
  id: string
  type: 'unusual_access_pattern' | 'excessive_failures' | 'off_hours_activity' | 'bulk_operations' | 'privilege_escalation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detectedAt: Date
  affectedUsers: UserId[]
  affectedPatients: PatientId[]
  evidence: AuditLogEntry[]
  riskScore: number
}

export interface ComplianceMetrics {
  lgpdCompliance: {
    consentTracking: number
    dataPortabilityRequests: number
    dataDeletionRequests: number
    breachIncidents: number
    responseTime: number // average response time in hours
  }
  accessControl: {
    successfulAccesses: number
    deniedAccesses: number
    unauthorizedAttempts: number
    privilegeViolations: number
  }
  dataIntegrity: {
    dataModifications: number
    unauthorizedChanges: number
    dataCorruption: number
    backupVerifications: number
  }
}

/**
 * Audit Reporting Service
 * 
 * Provides comprehensive audit reporting capabilities including compliance reports,
 * security incident analysis, and performance monitoring.
 * 
 * Requirements: 8.4, 8.6
 */
export class AuditReportingService {
  constructor(
    private readonly auditLogger: AuditLogger
  ) {}

  /**
   * Generate comprehensive audit report
   * @param reportType - Type of report to generate
   * @param filters - Report filters and parameters
   * @param dateRange - Date range for the report
   * @param generatedBy - User generating the report
   * @returns Promise resolving to audit report
   */
  async generateReport(
    reportType: AuditReportType,
    filters: AuditReportFilters,
    dateRange: { fromDate: Date; toDate: Date },
    generatedBy: UserId
  ): Promise<AuditReport> {
    try {
      const reportId = this.generateReportId()
      
      // Log report generation
      await this.auditLogger.logDataAccess({
        userId: generatedBy,
        patientId: new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
        operation: 'generate_report',
        dataType: 'audit_report',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: `Generating ${reportType} report`
      })

      // Build query based on filters
      const query = this.buildAuditQuery(filters, dateRange)
      
      // Fetch audit data
      const events = await this.auditLogger.queryAuditLogs(query)
      const statistics = await this.auditLogger.generateAuditStatistics(dateRange.fromDate, dateRange.toDate)
      
      // Analyze data based on report type
      const data = await this.analyzeAuditData(reportType, events, statistics, filters)
      
      // Generate summary and recommendations
      const summary = this.generateReportSummary(reportType, data)
      const recommendations = this.generateRecommendations(reportType, data, summary)

      const report: AuditReport = {
        id: reportId,
        title: this.getReportTitle(reportType),
        description: this.getReportDescription(reportType, dateRange),
        generatedAt: new Date(),
        generatedBy,
        reportType,
        dateRange,
        filters,
        data,
        summary,
        recommendations
      }

      return report
    } catch (error) {
      // Log report generation failure
      await this.auditLogger.logDataAccess({
        userId: generatedBy,
        patientId: new PatientId('00000000-0000-4000-8000-000000000000'), // System patient ID
        operation: 'generate_report',
        dataType: 'audit_report',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw new Error(`Audit report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate compliance summary report
   * @param dateRange - Date range for the report
   * @param generatedBy - User generating the report
   * @returns Promise resolving to compliance report
   */
  async generateComplianceReport(
    dateRange: { fromDate: Date; toDate: Date },
    generatedBy: UserId
  ): Promise<AuditReport> {
    return this.generateReport(
      'compliance_summary',
      { includeSystemEvents: true },
      dateRange,
      generatedBy
    )
  }

  /**
   * Generate security incidents report
   * @param dateRange - Date range for the report
   * @param generatedBy - User generating the report
   * @returns Promise resolving to security report
   */
  async generateSecurityReport(
    dateRange: { fromDate: Date; toDate: Date },
    generatedBy: UserId
  ): Promise<AuditReport> {
    return this.generateReport(
      'security_incidents',
      { 
        accessResults: ['denied'],
        operations: ['security_alert', 'failed_login', 'unauthorized_access'],
        severityLevel: 'medium'
      },
      dateRange,
      generatedBy
    )
  }

  /**
   * Generate user activity report
   * @param userId - Specific user to report on (optional)
   * @param dateRange - Date range for the report
   * @param generatedBy - User generating the report
   * @returns Promise resolving to user activity report
   */
  async generateUserActivityReport(
    userId: UserId | undefined,
    dateRange: { fromDate: Date; toDate: Date },
    generatedBy: UserId
  ): Promise<AuditReport> {
    return this.generateReport(
      'user_activity',
      { 
        userIds: userId ? [userId] : undefined,
        includeSystemEvents: false
      },
      dateRange,
      generatedBy
    )
  }

  /**
   * Generate patient access report
   * @param patientId - Specific patient to report on (optional)
   * @param dateRange - Date range for the report
   * @param generatedBy - User generating the report
   * @returns Promise resolving to patient access report
   */
  async generatePatientAccessReport(
    patientId: PatientId | undefined,
    dateRange: { fromDate: Date; toDate: Date },
    generatedBy: UserId
  ): Promise<AuditReport> {
    return this.generateReport(
      'patient_access',
      { 
        patientIds: patientId ? [patientId] : undefined,
        operations: ['read', 'update', 'create', 'delete'],
        dataTypes: ['patient', 'medical_record', 'document']
      },
      dateRange,
      generatedBy
    )
  }

  /**
   * Detect and analyze suspicious activities
   * @param dateRange - Date range to analyze
   * @returns Promise resolving to suspicious activities
   */
  async detectSuspiciousActivities(dateRange: { fromDate: Date; toDate: Date }): Promise<AuditAnomaly[]> {
    try {
      const query: AuditQuery = {
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        limit: 10000 // Large limit for analysis
      }

      const events = await this.auditLogger.queryAuditLogs(query)
      const anomalies: AuditAnomaly[] = []

      // Detect unusual access patterns
      anomalies.push(...this.detectUnusualAccessPatterns(events))
      
      // Detect excessive failures
      anomalies.push(...this.detectExcessiveFailures(events))
      
      // Detect off-hours activity
      anomalies.push(...this.detectOffHoursActivity(events))
      
      // Detect bulk operations
      anomalies.push(...this.detectBulkOperations(events))
      
      // Detect privilege escalation attempts
      anomalies.push(...this.detectPrivilegeEscalation(events))

      // Sort by risk score (highest first)
      return anomalies.sort((a, b) => b.riskScore - a.riskScore)
    } catch (error) {
      throw new Error(`Suspicious activity detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Export report in specified format
   * @param report - Report to export
   * @param format - Export format
   * @returns Promise resolving to exported report data
   */
  async exportReport(report: AuditReport, format: 'json' | 'csv' | 'xml' | 'pdf'): Promise<string> {
    try {
      switch (format) {
        case 'json':
          return JSON.stringify(report, null, 2)
        
        case 'csv':
          return this.convertReportToCSV(report)
        
        case 'xml':
          return this.convertReportToXML(report)
        
        case 'pdf':
          return this.convertReportToPDF(report)
        
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }
    } catch (error) {
      throw new Error(`Report export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods

  private buildAuditQuery(filters: AuditReportFilters, dateRange: { fromDate: Date; toDate: Date }): AuditQuery {
    const query: AuditQuery = {
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      limit: 10000 // Large limit for comprehensive reports
    }

    if (filters.userIds && filters.userIds.length > 0) {
      // For multiple users, we'll need to make multiple queries and combine results
      query.userId = filters.userIds[0] // Start with first user
    }

    if (filters.patientIds && filters.patientIds.length > 0) {
      query.patientId = filters.patientIds[0] // Start with first patient
    }

    if (filters.operations && filters.operations.length > 0) {
      query.operation = filters.operations[0] // Start with first operation
    }

    if (filters.dataTypes && filters.dataTypes.length > 0) {
      query.dataType = filters.dataTypes[0] // Start with first data type
    }

    if (filters.accessResults && filters.accessResults.length > 0) {
      query.accessResult = filters.accessResults[0] // Start with first access result
    }

    return query
  }

  private async analyzeAuditData(
    reportType: AuditReportType,
    events: AuditLogEntry[],
    statistics: AuditStatistics,
    filters: AuditReportFilters
  ): Promise<AuditReportData> {
    const trends = this.calculateTrends(events)
    const anomalies = await this.detectAnomaliesInEvents(events)
    const complianceMetrics = this.calculateComplianceMetrics(events)

    return {
      totalEvents: events.length,
      events,
      statistics,
      trends,
      anomalies,
      complianceMetrics
    }
  }

  private generateReportSummary(reportType: AuditReportType, data: AuditReportData): AuditReportSummary {
    const keyFindings = this.extractKeyFindings(reportType, data)
    const riskLevel = this.calculateRiskLevel(data)
    const complianceScore = this.calculateComplianceScore(data)
    const securityScore = this.calculateSecurityScore(data)
    const totalViolations = this.countViolations(data)
    const criticalIssues = this.countCriticalIssues(data)

    return {
      keyFindings,
      riskLevel,
      complianceScore,
      securityScore,
      totalViolations,
      criticalIssues
    }
  }

  private generateRecommendations(
    reportType: AuditReportType,
    data: AuditReportData,
    summary: AuditReportSummary
  ): string[] {
    const recommendations: string[] = []

    // Security recommendations
    if (summary.securityScore < 80) {
      recommendations.push('Implement additional security monitoring and alerting')
      recommendations.push('Review and strengthen access control policies')
    }

    // Compliance recommendations
    if (summary.complianceScore < 90) {
      recommendations.push('Enhance LGPD compliance procedures and training')
      recommendations.push('Implement automated compliance monitoring')
    }

    // Risk-based recommendations
    if (summary.riskLevel === 'high' || summary.riskLevel === 'critical') {
      recommendations.push('Immediate security review and incident response required')
      recommendations.push('Implement additional audit controls and monitoring')
    }

    // Anomaly-based recommendations
    if (data.anomalies.length > 0) {
      recommendations.push('Investigate detected anomalies and suspicious activities')
      recommendations.push('Review user access patterns and permissions')
    }

    // Performance recommendations
    if (data.totalEvents > 10000) {
      recommendations.push('Consider implementing audit log archiving and retention policies')
      recommendations.push('Optimize audit logging performance and storage')
    }

    return recommendations
  }

  private detectUnusualAccessPatterns(events: AuditLogEntry[]): AuditAnomaly[] {
    const anomalies: AuditAnomaly[] = []
    const userPatientAccess = new Map<UserId, Set<string>>()
    const systemPatientId = '00000000-0000-4000-8000-000000000000'

    // Group access by user
    events.forEach(event => {
      const patientIdValue = event.patientId.value || event.patientId.toString()
      if (patientIdValue !== systemPatientId) {
        if (!userPatientAccess.has(event.userId)) {
          userPatientAccess.set(event.userId, new Set())
        }
        userPatientAccess.get(event.userId)!.add(patientIdValue)
      }
    })

    // Detect users accessing unusually many patients
    userPatientAccess.forEach((patientIds, userId) => {
      if (patientIds.size > 50) { // Threshold for unusual access
        const affectedPatients = Array.from(patientIds).map(id => new PatientId(id))
        anomalies.push({
          id: `unusual_access_${userId}_${Date.now()}`,
          type: 'unusual_access_pattern',
          severity: patientIds.size > 100 ? 'high' : 'medium',
          description: `User ${userId} accessed ${patientIds.size} different patients`,
          detectedAt: new Date(),
          affectedUsers: [userId],
          affectedPatients,
          evidence: events.filter(e => e.userId === userId),
          riskScore: Math.min(100, patientIds.size * 2)
        })
      }
    })

    return anomalies
  }

  private detectExcessiveFailures(events: AuditLogEntry[]): AuditAnomaly[] {
    const anomalies: AuditAnomaly[] = []
    const userFailures = new Map<UserId, AuditLogEntry[]>()
    const systemPatientId = '00000000-0000-4000-8000-000000000000'

    // Group failures by user
    events.forEach(event => {
      if (event.accessResult === 'denied') {
        if (!userFailures.has(event.userId)) {
          userFailures.set(event.userId, [])
        }
        userFailures.get(event.userId)!.push(event)
      }
    })

    // Detect excessive failures
    userFailures.forEach((failures, userId) => {
      if (failures.length > 20) { // Threshold for excessive failures
        const patientIdValues = failures
          .map(f => f.patientId.value || f.patientId.toString())
          .filter(p => p !== systemPatientId)
        const uniquePatientIds = Array.from(new Set(patientIdValues)).map(id => new PatientId(id))
        
        anomalies.push({
          id: `excessive_failures_${userId}_${Date.now()}`,
          type: 'excessive_failures',
          severity: failures.length > 50 ? 'critical' : 'high',
          description: `User ${userId} had ${failures.length} failed access attempts`,
          detectedAt: new Date(),
          affectedUsers: [userId],
          affectedPatients: uniquePatientIds,
          evidence: failures,
          riskScore: Math.min(100, failures.length * 3)
        })
      }
    })

    return anomalies
  }

  private detectOffHoursActivity(events: AuditLogEntry[]): AuditAnomaly[] {
    const anomalies: AuditAnomaly[] = []
    const systemPatientId = '00000000-0000-4000-8000-000000000000'
    const offHoursEvents = events.filter(event => {
      const hour = event.timestamp.getHours()
      return hour < 6 || hour > 22 // Outside business hours
    })

    if (offHoursEvents.length > 10) {
      const affectedUsers = Array.from(new Set(offHoursEvents.map(e => e.userId)))
      const patientIdValues = offHoursEvents
        .map(e => e.patientId.value || e.patientId.toString())
        .filter(p => p !== systemPatientId)
      const uniquePatientIds = Array.from(new Set(patientIdValues)).map(id => new PatientId(id))
      
      anomalies.push({
        id: `off_hours_activity_${Date.now()}`,
        type: 'off_hours_activity',
        severity: offHoursEvents.length > 50 ? 'high' : 'medium',
        description: `${offHoursEvents.length} activities detected outside business hours`,
        detectedAt: new Date(),
        affectedUsers,
        affectedPatients: uniquePatientIds,
        evidence: offHoursEvents,
        riskScore: Math.min(100, offHoursEvents.length * 2)
      })
    }

    return anomalies
  }

  private detectBulkOperations(events: AuditLogEntry[]): AuditAnomaly[] {
    const anomalies: AuditAnomaly[] = []
    const userOperations = new Map<UserId, AuditLogEntry[]>()
    const systemPatientId = '00000000-0000-4000-8000-000000000000'

    // Group operations by user and time window
    events.forEach(event => {
      if (!userOperations.has(event.userId)) {
        userOperations.set(event.userId, [])
      }
      userOperations.get(event.userId)!.push(event)
    })

    // Detect bulk operations (many operations in short time)
    userOperations.forEach((operations, userId) => {
      const sortedOps = operations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      // Check for 20+ operations within 1 hour
      for (let i = 0; i < sortedOps.length - 19; i++) {
        const windowStart = sortedOps[i].timestamp
        const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000) // 1 hour
        
        const opsInWindow = sortedOps.slice(i).filter(op => op.timestamp <= windowEnd)
        
        if (opsInWindow.length >= 20) {
          const patientIdValues = opsInWindow
            .map(o => o.patientId.value || o.patientId.toString())
            .filter(p => p !== systemPatientId)
          const uniquePatientIds = Array.from(new Set(patientIdValues)).map(id => new PatientId(id))
          
          anomalies.push({
            id: `bulk_operations_${userId}_${windowStart.getTime()}`,
            type: 'bulk_operations',
            severity: opsInWindow.length > 50 ? 'high' : 'medium',
            description: `User ${userId} performed ${opsInWindow.length} operations within 1 hour`,
            detectedAt: new Date(),
            affectedUsers: [userId],
            affectedPatients: uniquePatientIds,
            evidence: opsInWindow,
            riskScore: Math.min(100, opsInWindow.length * 1.5)
          })
          break // Only report first occurrence per user
        }
      }
    })

    return anomalies
  }

  private detectPrivilegeEscalation(events: AuditLogEntry[]): AuditAnomaly[] {
    const anomalies: AuditAnomaly[] = []
    
    // Look for patterns that might indicate privilege escalation
    const suspiciousOperations = events.filter(event => 
      event.operation.includes('admin') || 
      event.operation.includes('privilege') ||
      event.operation.includes('permission') ||
      event.dataType === 'user_management'
    )

    if (suspiciousOperations.length > 0) {
      const affectedUsers = Array.from(new Set(suspiciousOperations.map(e => e.userId)))
      
      anomalies.push({
        id: `privilege_escalation_${Date.now()}`,
        type: 'privilege_escalation',
        severity: 'critical',
        description: `Potential privilege escalation attempts detected`,
        detectedAt: new Date(),
        affectedUsers,
        affectedPatients: [],
        evidence: suspiciousOperations,
        riskScore: 90
      })
    }

    return anomalies
  }

  private async detectAnomaliesInEvents(events: AuditLogEntry[]): Promise<AuditAnomaly[]> {
    const dateRange = {
      fromDate: new Date(Math.min(...events.map(e => e.timestamp.getTime()))),
      toDate: new Date(Math.max(...events.map(e => e.timestamp.getTime())))
    }
    
    return this.detectSuspiciousActivities(dateRange)
  }

  private calculateTrends(events: AuditLogEntry[]): AuditTrend[] {
    const trends: AuditTrend[] = []
    
    // Group events by day
    const dailyEvents = new Map<string, number>()
    events.forEach(event => {
      const day = event.timestamp.toISOString().split('T')[0]
      dailyEvents.set(day, (dailyEvents.get(day) || 0) + 1)
    })

    // Calculate daily trend
    const days = Array.from(dailyEvents.keys()).sort()
    if (days.length >= 2) {
      const firstDay = dailyEvents.get(days[0]) || 0
      const lastDay = dailyEvents.get(days[days.length - 1]) || 0
      const change = lastDay - firstDay
      const changePercentage = firstDay > 0 ? (change / firstDay) * 100 : 0

      trends.push({
        period: 'daily',
        metric: 'total_events',
        value: lastDay,
        change,
        changePercentage
      })
    }

    return trends
  }

  private calculateComplianceMetrics(events: AuditLogEntry[]): ComplianceMetrics {
    const lgpdEvents = events.filter(e => e.dataType === 'lgpd_compliance')
    const accessEvents = events.filter(e => ['read', 'update', 'create', 'delete'].includes(e.operation))
    const modificationEvents = events.filter(e => ['update', 'create', 'delete'].includes(e.operation))

    return {
      lgpdCompliance: {
        consentTracking: lgpdEvents.filter(e => e.operation.includes('consent')).length,
        dataPortabilityRequests: lgpdEvents.filter(e => e.operation === 'data_export').length,
        dataDeletionRequests: lgpdEvents.filter(e => e.operation === 'data_deletion').length,
        breachIncidents: lgpdEvents.filter(e => e.operation === 'breach_detected').length,
        responseTime: 24 // Default response time in hours
      },
      accessControl: {
        successfulAccesses: accessEvents.filter(e => e.accessResult === 'granted').length,
        deniedAccesses: accessEvents.filter(e => e.accessResult === 'denied').length,
        unauthorizedAttempts: events.filter(e => e.operation === 'unauthorized_access').length,
        privilegeViolations: events.filter(e => e.operation === 'privilege_violation').length
      },
      dataIntegrity: {
        dataModifications: modificationEvents.length,
        unauthorizedChanges: modificationEvents.filter(e => e.accessResult === 'denied').length,
        dataCorruption: events.filter(e => e.operation === 'data_corruption').length,
        backupVerifications: events.filter(e => e.operation === 'backup_verification').length
      }
    }
  }

  private extractKeyFindings(reportType: AuditReportType, data: AuditReportData): string[] {
    const findings: string[] = []

    findings.push(`Total audit events: ${data.totalEvents}`)
    findings.push(`Unique users active: ${data.statistics.uniqueUsers}`)
    findings.push(`Access attempts: ${data.statistics.accessAttempts}`)
    findings.push(`Denied accesses: ${data.statistics.deniedAccesses}`)

    if (data.anomalies.length > 0) {
      findings.push(`Suspicious activities detected: ${data.anomalies.length}`)
    }

    if (data.complianceMetrics.lgpdCompliance.breachIncidents > 0) {
      findings.push(`LGPD breach incidents: ${data.complianceMetrics.lgpdCompliance.breachIncidents}`)
    }

    return findings
  }

  private calculateRiskLevel(data: AuditReportData): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0

    // Factor in denied accesses
    const deniedPercentage = data.statistics.accessAttempts > 0 
      ? (data.statistics.deniedAccesses / data.statistics.accessAttempts) * 100 
      : 0
    
    if (deniedPercentage > 20) riskScore += 30
    else if (deniedPercentage > 10) riskScore += 15
    else if (deniedPercentage > 5) riskScore += 5

    // Factor in anomalies
    const criticalAnomalies = data.anomalies.filter(a => a.severity === 'critical').length
    const highAnomalies = data.anomalies.filter(a => a.severity === 'high').length
    
    riskScore += criticalAnomalies * 25
    riskScore += highAnomalies * 15

    // Factor in compliance violations
    if (data.complianceMetrics.lgpdCompliance.breachIncidents > 0) {
      riskScore += 40
    }

    if (riskScore >= 80) return 'critical'
    if (riskScore >= 60) return 'high'
    if (riskScore >= 30) return 'medium'
    return 'low'
  }

  private calculateComplianceScore(data: AuditReportData): number {
    let score = 100

    // Deduct for LGPD violations
    score -= data.complianceMetrics.lgpdCompliance.breachIncidents * 20

    // Deduct for access control issues
    const accessViolations = data.complianceMetrics.accessControl.unauthorizedAttempts + 
                           data.complianceMetrics.accessControl.privilegeViolations
    score -= accessViolations * 5

    // Deduct for data integrity issues
    score -= data.complianceMetrics.dataIntegrity.unauthorizedChanges * 3
    score -= data.complianceMetrics.dataIntegrity.dataCorruption * 10

    return Math.max(0, score)
  }

  private calculateSecurityScore(data: AuditReportData): number {
    let score = 100

    // Deduct for security anomalies
    const criticalAnomalies = data.anomalies.filter(a => a.severity === 'critical').length
    const highAnomalies = data.anomalies.filter(a => a.severity === 'high').length
    
    score -= criticalAnomalies * 15
    score -= highAnomalies * 10

    // Deduct for excessive denied accesses
    const deniedPercentage = data.statistics.accessAttempts > 0 
      ? (data.statistics.deniedAccesses / data.statistics.accessAttempts) * 100 
      : 0
    
    if (deniedPercentage > 10) {
      score -= (deniedPercentage - 10) * 2
    }

    return Math.max(0, score)
  }

  private countViolations(data: AuditReportData): number {
    return data.complianceMetrics.accessControl.unauthorizedAttempts +
           data.complianceMetrics.accessControl.privilegeViolations +
           data.complianceMetrics.dataIntegrity.unauthorizedChanges +
           data.complianceMetrics.lgpdCompliance.breachIncidents
  }

  private countCriticalIssues(data: AuditReportData): number {
    return data.anomalies.filter(a => a.severity === 'critical').length +
           data.complianceMetrics.lgpdCompliance.breachIncidents
  }

  private getReportTitle(reportType: AuditReportType): string {
    const titles = {
      compliance_summary: 'LGPD Compliance Summary Report',
      security_incidents: 'Security Incidents Analysis Report',
      user_activity: 'User Activity Report',
      patient_access: 'Patient Data Access Report',
      data_modifications: 'Data Modifications Report',
      lgpd_compliance: 'LGPD Compliance Detailed Report',
      system_performance: 'System Performance Report',
      suspicious_activities: 'Suspicious Activities Report'
    }
    return titles[reportType] || 'Audit Report'
  }

  private getReportDescription(reportType: AuditReportType, dateRange: { fromDate: Date; toDate: Date }): string {
    const fromStr = dateRange.fromDate.toISOString().split('T')[0]
    const toStr = dateRange.toDate.toISOString().split('T')[0]
    
    return `Comprehensive audit analysis for the period from ${fromStr} to ${toStr}`
  }

  private convertReportToCSV(report: AuditReport): string {
    const lines: string[] = []
    
    // Report header
    lines.push(`Report Title,${report.title}`)
    lines.push(`Generated At,${report.generatedAt.toISOString()}`)
    lines.push(`Report Type,${report.reportType}`)
    lines.push(`Date Range,${report.dateRange.fromDate.toISOString()} to ${report.dateRange.toDate.toISOString()}`)
    lines.push('')
    
    // Summary
    lines.push('Summary')
    lines.push(`Risk Level,${report.summary.riskLevel}`)
    lines.push(`Compliance Score,${report.summary.complianceScore}`)
    lines.push(`Security Score,${report.summary.securityScore}`)
    lines.push(`Total Violations,${report.summary.totalViolations}`)
    lines.push(`Critical Issues,${report.summary.criticalIssues}`)
    lines.push('')
    
    // Key findings
    lines.push('Key Findings')
    report.summary.keyFindings.forEach(finding => {
      lines.push(`"${finding}"`)
    })
    lines.push('')
    
    // Recommendations
    lines.push('Recommendations')
    report.recommendations.forEach(rec => {
      lines.push(`"${rec}"`)
    })
    
    return lines.join('\n')
  }

  private convertReportToXML(report: AuditReport): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<auditReport>
  <id>${report.id}</id>
  <title>${this.escapeXML(report.title)}</title>
  <description>${this.escapeXML(report.description)}</description>
  <generatedAt>${report.generatedAt.toISOString()}</generatedAt>
  <reportType>${report.reportType}</reportType>
  <summary>
    <riskLevel>${report.summary.riskLevel}</riskLevel>
    <complianceScore>${report.summary.complianceScore}</complianceScore>
    <securityScore>${report.summary.securityScore}</securityScore>
    <totalViolations>${report.summary.totalViolations}</totalViolations>
    <criticalIssues>${report.summary.criticalIssues}</criticalIssues>
  </summary>
  <recommendations>
    ${report.recommendations.map(rec => `<recommendation>${this.escapeXML(rec)}</recommendation>`).join('\n    ')}
  </recommendations>
</auditReport>`
  }

  private convertReportToPDF(report: AuditReport): string {
    // This would typically use a PDF generation library
    // For now, return a placeholder
    return `PDF Report: ${report.title} - Generated at ${report.generatedAt.toISOString()}`
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}