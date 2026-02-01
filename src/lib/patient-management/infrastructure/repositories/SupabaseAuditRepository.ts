// ============================================================================
// SUPABASE AUDIT REPOSITORY
// Supabase implementation for audit log storage
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { IAuditRepository, AuditLogEntry, AuditQuery } from '../services/AuditLogger'

/**
 * Supabase Audit Repository
 * 
 * Implements audit log storage using Supabase PostgreSQL database
 * with proper indexing and retention policies.
 */
export class SupabaseAuditRepository implements IAuditRepository {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Create new audit log entry
   * @param logEntry - Audit log entry to store
   * @returns Promise resolving when entry is stored
   */
  async create(logEntry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('audit_log')
        .insert({
          id: logEntry.id,
          user_id: logEntry.userId,
          patient_id: logEntry.patientId === 'system' ? null : logEntry.patientId,
          operation: logEntry.operation,
          table_name: logEntry.dataType,
          record_id: null, // Could be populated if tracking specific record changes
          old_values: logEntry.oldValues ? JSON.stringify(logEntry.oldValues) : null,
          new_values: logEntry.newValues ? JSON.stringify(logEntry.newValues) : null,
          timestamp: logEntry.timestamp.toISOString(),
          ip_address: logEntry.ipAddress || null,
          user_agent: logEntry.userAgent || null,
          // Store additional metadata in a JSONB field
          metadata: {
            accessResult: logEntry.accessResult,
            justification: logEntry.justification,
            sessionId: logEntry.sessionId,
            requestId: logEntry.requestId
          }
        })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to create audit log entry: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search audit logs with filtering
   * @param query - Search query parameters
   * @returns Promise resolving to matching audit log entries
   */
  async search(query: AuditQuery): Promise<AuditLogEntry[]> {
    try {
      let supabaseQuery = this.supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false })

      // Apply filters
      if (query.userId) {
        supabaseQuery = supabaseQuery.eq('user_id', query.userId)
      }

      if (query.patientId && query.patientId !== 'system') {
        supabaseQuery = supabaseQuery.eq('patient_id', query.patientId)
      }

      if (query.operation) {
        supabaseQuery = supabaseQuery.eq('operation', query.operation)
      }

      if (query.dataType) {
        supabaseQuery = supabaseQuery.eq('table_name', query.dataType)
      }

      if (query.accessResult) {
        supabaseQuery = supabaseQuery.eq('metadata->>accessResult', query.accessResult)
      }

      if (query.fromDate) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.fromDate.toISOString())
      }

      if (query.toDate) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.toDate.toISOString())
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit)
      }

      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, (query.offset + (query.limit || 50)) - 1)
      }

      const { data, error } = await supabaseQuery

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      // Transform database records to AuditLogEntry objects
      return (data || []).map(this.transformDatabaseRecord)
    } catch (error) {
      throw new Error(`Failed to search audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete audit logs older than specified date
   * @param date - Cutoff date for deletion
   * @returns Promise resolving to number of deleted records
   */
  async deleteOlderThan(date: Date): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .delete()
        .lt('timestamp', date.toISOString())
        .select('id')

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return data?.length || 0
    } catch (error) {
      throw new Error(`Failed to delete old audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get audit log statistics
   * @param fromDate - Start date for statistics
   * @param toDate - End date for statistics
   * @returns Promise resolving to audit statistics
   */
  async getStatistics(fromDate?: Date, toDate?: Date): Promise<{
    totalLogs: number
    uniqueUsers: number
    operationCounts: Record<string, number>
    accessResultCounts: Record<string, number>
  }> {
    try {
      let query = this.supabase
        .from('audit_log')
        .select('operation, user_id, metadata')

      if (fromDate) {
        query = query.gte('timestamp', fromDate.toISOString())
      }

      if (toDate) {
        query = query.lte('timestamp', toDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const logs = data || []
      const totalLogs = logs.length
      const uniqueUsers = new Set(logs.map(log => log.user_id)).size

      // Count operations
      const operationCounts: Record<string, number> = {}
      logs.forEach(log => {
        operationCounts[log.operation] = (operationCounts[log.operation] || 0) + 1
      })

      // Count access results
      const accessResultCounts: Record<string, number> = {}
      logs.forEach(log => {
        const accessResult = log.metadata?.accessResult || 'unknown'
        accessResultCounts[accessResult] = (accessResultCounts[accessResult] || 0) + 1
      })

      return {
        totalLogs,
        uniqueUsers,
        operationCounts,
        accessResultCounts
      }
    } catch (error) {
      throw new Error(`Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get most accessed patients
   * @param limit - Number of patients to return
   * @param fromDate - Start date for analysis
   * @returns Promise resolving to most accessed patients
   */
  async getMostAccessedPatients(limit: number = 10, fromDate?: Date): Promise<Array<{ patientId: string; accessCount: number }>> {
    try {
      let query = this.supabase
        .from('audit_log')
        .select('patient_id')
        .not('patient_id', 'is', null)

      if (fromDate) {
        query = query.gte('timestamp', fromDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      // Count patient accesses
      const patientCounts = new Map<string, number>()
      data?.forEach(log => {
        if (log.patient_id) {
          const count = patientCounts.get(log.patient_id) || 0
          patientCounts.set(log.patient_id, count + 1)
        }
      })

      // Sort and limit results
      return Array.from(patientCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([patientId, accessCount]) => ({ patientId, accessCount }))
    } catch (error) {
      throw new Error(`Failed to get most accessed patients: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get suspicious activities
   * @param limit - Number of activities to return
   * @param fromDate - Start date for analysis
   * @returns Promise resolving to suspicious activities
   */
  async getSuspiciousActivities(limit: number = 50, fromDate?: Date): Promise<AuditLogEntry[]> {
    try {
      let query = this.supabase
        .from('audit_log')
        .select('*')
        .or('operation.eq.security_alert,metadata->>accessResult.eq.denied')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (fromDate) {
        query = query.gte('timestamp', fromDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return (data || []).map(this.transformDatabaseRecord)
    } catch (error) {
      throw new Error(`Failed to get suspicious activities: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods

  private transformDatabaseRecord(record: any): AuditLogEntry {
    return {
      id: record.id,
      userId: record.user_id,
      patientId: record.patient_id || 'system',
      operation: record.operation,
      dataType: record.table_name || 'unknown',
      accessResult: record.metadata?.accessResult || 'unknown',
      timestamp: new Date(record.timestamp),
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
      justification: record.metadata?.justification,
      oldValues: record.old_values ? JSON.parse(record.old_values) : undefined,
      newValues: record.new_values ? JSON.parse(record.new_values) : undefined,
      sessionId: record.metadata?.sessionId,
      requestId: record.metadata?.requestId
    }
  }
}

/**
 * Factory function to create Supabase audit repository
 */
export function createSupabaseAuditRepository(): SupabaseAuditRepository {
  return new SupabaseAuditRepository()
}