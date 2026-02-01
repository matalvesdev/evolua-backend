// ============================================================================
// AUDIT LOGGER SERVICE
// Comprehensive audit logging for LGPD compliance
// ============================================================================

import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'

export interface AuditLogEntry {
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
  sessionId?: string
  requestId?: string
}

export interface AuditQuery {
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

export interface AuditStatistics {
  totalLogs: number
  accessAttempts: number
  deniedAccesses: number
  uniqueUsers: number
  mostAccessedPatients: Array<{ patientId: PatientId; accessCount: number }>
  operationCounts: Record<string, number>
  suspiciousActivities: AuditLogEntry[]
}

/**
 * Audit Logger Service
 * 
 * Provides comprehensive audit logging capabilities for LGPD compliance,
 * including access logging, change tracking, and security monitoring.
 * 
 * Requirements: 1.3, 1.4, 8.1, 8.2, 8.3, 8.5
 */
export class AuditLogger {
  constructor(
    private readonly auditRepository: IAuditRepository,
    private readonly encryptionService: IEncryptionService
  ) {}

  /**
   * Log data access attempt
   * @param logData - Audit log data
   * @returns Promise resolving when log is stored
   */
  async logDataAccess(logData: Omit<AuditLogEntry, 'id'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...logData,
        id: this.generateLogId(),
        timestamp: logData.timestamp || new Date()
      }

      // Encrypt sensitive data in the log entry
      if (auditEntry.oldValues) {
        auditEntry.oldValues = await this.encryptLogData(auditEntry.oldValues)
      }
      
      if (auditEntry.newValues) {
        auditEntry.newValues = await this.encryptLogData(auditEntry.newValues)
      }

      // Store the audit log
      await this.auditRepository.create(auditEntry)

      // Check for suspicious activity patterns
      await this.detectSuspiciousActivity(auditEntry)
    } catch (error) {
      // Audit logging failures should not break the main application
      console.error('Audit logging failed:', error)
      
      // Try to log the failure itself (without encryption to avoid recursive failures)
      try {
        await this.auditRepository.create({
          id: this.generateLogId(),
          userId: logData.userId,
          patientId: 'system' as PatientId,
          operation: 'audit_log_failure',
          dataType: 'system',
          accessResult: 'denied',
          timestamp: new Date(),
          justification: `Audit logging failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      } catch (fallbackError) {
        console.error('Fallback audit logging also failed:', fallbackError)
      }
    }
  }

  /**
   * Log patient data modification
   * @param userId - User making the change
   * @param patientId - Patient whose data is being modified
   * @param operation - Type of operation (create, update, delete)
   * @param dataType - Type of data being modified
   * @param oldValues - Previous values (for updates)
   * @param newValues - New values
   * @param justification - Reason for the change
   * @returns Promise resolving when log is stored
   */
  async logDataModification(
    userId: UserId,
    patientId: PatientId,
    operation: 'create' | 'update' | 'delete',
    dataType: string,
    oldValues?: any,
    newValues?: any,
    justification?: string
  ): Promise<void> {
    await this.logDataAccess({
      userId,
      patientId,
      operation,
      dataType,
      accessResult: 'granted',
      timestamp: new Date(),
      oldValues,
      newValues,
      justification
    })
  }

  /**
   * Log user authentication events
   * @param userId - User ID
   * @param event - Authentication event type
   * @param success - Whether authentication was successful
   * @param ipAddress - User's IP address
   * @param userAgent - User's browser/client info
   * @returns Promise resolving when log is stored
   */
  async logAuthenticationEvent(
    userId: UserId,
    event: 'login' | 'logout' | 'password_change' | 'failed_login',
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logDataAccess({
      userId,
      patientId: 'system' as PatientId,
      operation: event,
      dataType: 'authentication',
      accessResult: success ? 'granted' : 'denied',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      justification: `Authentication event: ${event}`
    })
  }

  /**
   * Log LGPD compliance events
   * @param userId - User performing the action
   * @param patientId - Affected patient
   * @param event - LGPD event type
   * @param details - Event details
   * @returns Promise resolving when log is stored
   */
  async logLGPDEvent(
    userId: UserId,
    patientId: PatientId,
    event: 'consent_granted' | 'consent_withdrawn' | 'data_export' | 'data_deletion' | 'breach_detected',
    details: any
  ): Promise<void> {
    await this.logDataAccess({
      userId,
      patientId,
      operation: event,
      dataType: 'lgpd_compliance',
      accessResult: 'granted',
      timestamp: new Date(),
      newValues: details,
      justification: `LGPD compliance event: ${event}`
    })
  }

  /**
   * Query audit logs with filtering
   * @param query - Query parameters
   * @returns Promise resolving to filtered audit logs
   */
  async queryAuditLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    try {
      const logs = await this.auditRepository.search(query)
      
      // Decrypt sensitive data for authorized access
      const decryptedLogs = await Promise.all(
        logs.map(async (log) => ({
          ...log,
          oldValues: log.oldValues ? await this.decryptLogData(log.oldValues) : undefined,
          newValues: log.newValues ? await this.decryptLogData(log.newValues) : undefined
        }))
      )
      
      return decryptedLogs
    } catch (error) {
      throw new Error(`Audit log query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate audit statistics
   * @param fromDate - Start date for statistics
   * @param toDate - End date for statistics
   * @returns Promise resolving to audit statistics
   */
  async generateAuditStatistics(fromDate?: Date, toDate?: Date): Promise<AuditStatistics> {
    try {
      const query: AuditQuery = {
        fromDate,
        toDate,
        limit: 10000 // Large limit for statistics
      }
      
      const logs = await this.auditRepository.search(query)
      
      // Calculate statistics
      const totalLogs = logs.length
      const accessAttempts = logs.filter(log => 
        ['read', 'create', 'update', 'delete'].includes(log.operation)
      ).length
      const deniedAccesses = logs.filter(log => log.accessResult === 'denied').length
      
      const uniqueUsers = new Set(logs.map(log => log.userId)).size
      
      // Most accessed patients
      const patientAccessCounts = new Map<PatientId, number>()
      logs.forEach(log => {
        if (log.patientId !== 'system') {
          const count = patientAccessCounts.get(log.patientId) || 0
          patientAccessCounts.set(log.patientId, count + 1)
        }
      })
      
      const mostAccessedPatients = Array.from(patientAccessCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([patientId, accessCount]) => ({ patientId, accessCount }))
      
      // Operation counts
      const operationCounts: Record<string, number> = {}
      logs.forEach(log => {
        operationCounts[log.operation] = (operationCounts[log.operation] || 0) + 1
      })
      
      // Suspicious activities (simplified detection)
      const suspiciousActivities = await this.identifySuspiciousActivities(logs)
      
      return {
        totalLogs,
        accessAttempts,
        deniedAccesses,
        uniqueUsers,
        mostAccessedPatients,
        operationCounts,
        suspiciousActivities
      }
    } catch (error) {
      throw new Error(`Audit statistics generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Export audit logs for compliance reporting
   * @param query - Query parameters for export
   * @param format - Export format
   * @returns Promise resolving to exported audit data
   */
  async exportAuditLogs(query: AuditQuery, format: 'json' | 'csv' | 'xml'): Promise<string> {
    try {
      const logs = await this.queryAuditLogs(query)
      
      switch (format) {
        case 'json':
          return JSON.stringify(logs, null, 2)
        
        case 'csv':
          return this.convertToCSV(logs)
        
        case 'xml':
          return this.convertToXML(logs)
        
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }
    } catch (error) {
      throw new Error(`Audit log export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Purge old audit logs according to retention policy
   * @param retentionDays - Number of days to retain logs
   * @returns Promise resolving to number of purged logs
   */
  async purgeOldLogs(retentionDays: number = 2555): Promise<number> { // 7 years default
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      const purgedCount = await this.auditRepository.deleteOlderThan(cutoffDate)
      
      // Log the purge operation
      await this.logDataAccess({
        userId: 'system' as UserId,
        patientId: 'system' as PatientId,
        operation: 'purge_audit_logs',
        dataType: 'audit_log',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: `Purged ${purgedCount} audit logs older than ${retentionDays} days`
      })
      
      return purgedCount
    } catch (error) {
      throw new Error(`Audit log purge failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods

  private async encryptLogData(data: any): Promise<string> {
    try {
      return await this.encryptionService.encrypt(JSON.stringify(data))
    } catch (error) {
      // If encryption fails, store a placeholder to maintain audit integrity
      return JSON.stringify({ error: 'Encryption failed', timestamp: new Date() })
    }
  }

  private async decryptLogData(encryptedData: string): Promise<any> {
    try {
      const decryptedString = await this.encryptionService.decrypt(encryptedData)
      return JSON.parse(decryptedString)
    } catch (error) {
      // If decryption fails, return error info
      return { error: 'Decryption failed', originalData: 'encrypted' }
    }
  }

  private async detectSuspiciousActivity(logEntry: AuditLogEntry): Promise<void> {
    try {
      // Simple suspicious activity detection patterns
      const recentLogs = await this.auditRepository.search({
        userId: logEntry.userId,
        fromDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        limit: 100
      })
      
      // Check for excessive failed access attempts
      const failedAttempts = recentLogs.filter(log => log.accessResult === 'denied').length
      if (failedAttempts > 10) {
        await this.logSecurityAlert('excessive_failed_attempts', logEntry.userId, {
          failedAttempts,
          timeWindow: '1 hour'
        })
      }
      
      // Check for unusual access patterns (accessing many different patients quickly)
      const uniquePatients = new Set(recentLogs.map(log => log.patientId)).size
      if (uniquePatients > 20) {
        await this.logSecurityAlert('unusual_access_pattern', logEntry.userId, {
          uniquePatients,
          timeWindow: '1 hour'
        })
      }
      
      // Check for off-hours access
      const hour = logEntry.timestamp.getHours()
      if (hour < 6 || hour > 22) {
        await this.logSecurityAlert('off_hours_access', logEntry.userId, {
          accessTime: logEntry.timestamp,
          operation: logEntry.operation
        })
      }
    } catch (error) {
      console.error('Suspicious activity detection failed:', error)
    }
  }

  private async logSecurityAlert(alertType: string, userId: UserId, details: any): Promise<void> {
    await this.logDataAccess({
      userId,
      patientId: 'system' as PatientId,
      operation: 'security_alert',
      dataType: 'security',
      accessResult: 'denied',
      timestamp: new Date(),
      newValues: { alertType, details },
      justification: `Security alert: ${alertType}`
    })
  }

  private async identifySuspiciousActivities(logs: AuditLogEntry[]): Promise<AuditLogEntry[]> {
    // Return logs that match suspicious patterns
    return logs.filter(log => 
      log.operation === 'security_alert' || 
      log.accessResult === 'denied' ||
      (log.timestamp.getHours() < 6 || log.timestamp.getHours() > 22)
    ).slice(0, 50) // Limit to 50 most recent suspicious activities
  }

  private convertToCSV(logs: AuditLogEntry[]): string {
    const headers = ['id', 'userId', 'patientId', 'operation', 'dataType', 'accessResult', 'timestamp', 'justification']
    const csvRows = [headers.join(',')]
    
    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header as keyof AuditLogEntry]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      })
      csvRows.push(row.join(','))
    })
    
    return csvRows.join('\n')
  }

  private convertToXML(logs: AuditLogEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditLogs>\n'
    
    logs.forEach(log => {
      xml += '  <auditLog>\n'
      Object.entries(log).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          xml += `    <${key}>${this.escapeXML(String(value))}</${key}>\n`
        }
      })
      xml += '  </auditLog>\n'
    })
    
    xml += '</auditLogs>'
    return xml
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

// Supporting interfaces
export interface IAuditRepository {
  create(logEntry: AuditLogEntry): Promise<void>
  search(query: AuditQuery): Promise<AuditLogEntry[]>
  deleteOlderThan(date: Date): Promise<number>
}

export interface IEncryptionService {
  encrypt(data: string): Promise<string>
  decrypt(encryptedData: string): Promise<string>
}