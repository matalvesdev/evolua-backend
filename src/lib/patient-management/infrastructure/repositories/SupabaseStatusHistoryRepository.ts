// ============================================================================
// SUPABASE STATUS HISTORY REPOSITORY IMPLEMENTATION
// Supabase implementation for patient status history management
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { StatusTransition } from '../../application/services/StatusTracker'
import {
  IStatusHistoryRepository,
  StatusHistorySearchCriteria,
  StatusHistoryPaginationOptions,
  StatusHistoryPaginatedResult,
  StatusStatisticsData
} from './IStatusHistoryRepository'

/**
 * Supabase Status History Repository Implementation
 * 
 * Provides persistent storage for patient status transitions using Supabase.
 * Implements efficient querying, filtering, and statistical analysis of
 * status change patterns.
 * 
 * Requirements: 3.1, 3.2, 3.5, 3.6
 */
export class SupabaseStatusHistoryRepository implements IStatusHistoryRepository {
  private supabase: ReturnType<typeof createClient>

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async create(transition: StatusTransition): Promise<StatusTransition> {
    try {
      const { data, error } = await this.supabase
        .from('patient_status_history')
        .insert({
          id: transition.id,
          patient_id: transition.patientId,
          from_status: transition.fromStatus,
          to_status: transition.toStatus,
          reason: transition.reason,
          changed_at: transition.timestamp.toISOString(),
          changed_by: transition.changedBy
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create status transition: ${error.message}`)
      }

      return this.mapToStatusTransition(data)
    } catch (error) {
      throw new Error(`Status transition creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findById(id: string): Promise<StatusTransition | null> {
    try {
      const { data, error } = await this.supabase
        .from('patient_status_history')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Record not found
        }
        throw new Error(`Failed to find status transition: ${error.message}`)
      }

      return this.mapToStatusTransition(data)
    } catch (error) {
      throw new Error(`Status transition retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findByPatientId(
    patientId: PatientId,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult> {
    try {
      const offset = (pagination.page - 1) * pagination.limit
      const sortColumn = this.mapSortColumn(pagination.sortBy || 'timestamp')
      const sortOrder = pagination.sortOrder || 'desc'

      // Get total count
      const { count } = await this.supabase
        .from('patient_status_history')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)

      // Get paginated data
      const { data, error } = await this.supabase
        .from('patient_status_history')
        .select('*')
        .eq('patient_id', patientId)
        .order(sortColumn, { ascending: sortOrder === 'asc' })
        .range(offset, offset + pagination.limit - 1)

      if (error) {
        throw new Error(`Failed to find patient status history: ${error.message}`)
      }

      const transitions = data.map(row => this.mapToStatusTransition(row))
      const totalPages = Math.ceil((count || 0) / pagination.limit)

      return {
        data: transitions,
        total: count || 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1
      }
    } catch (error) {
      throw new Error(`Patient status history retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async search(
    criteria: StatusHistorySearchCriteria,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult> {
    try {
      let query = this.supabase.from('patient_status_history').select('*', { count: 'exact' })

      // Apply filters
      if (criteria.patientId) {
        query = query.eq('patient_id', criteria.patientId)
      }

      if (criteria.fromStatus) {
        query = query.eq('from_status', criteria.fromStatus)
      }

      if (criteria.toStatus) {
        query = query.eq('to_status', criteria.toStatus)
      }

      if (criteria.changedBy) {
        query = query.eq('changed_by', criteria.changedBy)
      }

      if (criteria.changedAfter) {
        query = query.gte('changed_at', criteria.changedAfter.toISOString())
      }

      if (criteria.changedBefore) {
        query = query.lte('changed_at', criteria.changedBefore.toISOString())
      }

      if (criteria.hasReason !== undefined) {
        if (criteria.hasReason) {
          query = query.not('reason', 'is', null)
        } else {
          query = query.is('reason', null)
        }
      }

      // Get total count
      const { count } = await query

      // Apply pagination and sorting
      const offset = (pagination.page - 1) * pagination.limit
      const sortColumn = this.mapSortColumn(pagination.sortBy || 'timestamp')
      const sortOrder = pagination.sortOrder || 'desc'

      const { data, error } = await query
        .order(sortColumn, { ascending: sortOrder === 'asc' })
        .range(offset, offset + pagination.limit - 1)

      if (error) {
        throw new Error(`Failed to search status history: ${error.message}`)
      }

      const transitions = data.map(row => this.mapToStatusTransition(row))
      const totalPages = Math.ceil((count || 0) / pagination.limit)

      return {
        data: transitions,
        total: count || 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1
      }
    } catch (error) {
      throw new Error(`Status history search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getLatestTransition(patientId: PatientId): Promise<StatusTransition | null> {
    try {
      const { data, error } = await this.supabase
        .from('patient_status_history')
        .select('*')
        .eq('patient_id', patientId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No transitions found
        }
        throw new Error(`Failed to get latest transition: ${error.message}`)
      }

      return this.mapToStatusTransition(data)
    } catch (error) {
      throw new Error(`Latest transition retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult> {
    return this.search(
      {
        changedAfter: startDate,
        changedBefore: endDate
      },
      pagination
    )
  }

  async findByUser(
    userId: UserId,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult> {
    return this.search({ changedBy: userId }, pagination)
  }

  async getStatistics(): Promise<StatusStatisticsData> {
    try {
      // Get status counts from patients table
      const statusCounts: Record<PatientStatus, number> = {} as any
      for (const status of Object.values(PatientStatus)) {
        const { count } = await this.supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('status', status)
        
        statusCounts[status] = count || 0
      }

      // Get transitions for different time periods
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)

      const { count: transitionsToday } = await this.supabase
        .from('patient_status_history')
        .select('*', { count: 'exact', head: true })
        .gte('changed_at', today.toISOString())

      const { count: transitionsThisWeek } = await this.supabase
        .from('patient_status_history')
        .select('*', { count: 'exact', head: true })
        .gte('changed_at', weekAgo.toISOString())

      const { count: transitionsThisMonth } = await this.supabase
        .from('patient_status_history')
        .select('*', { count: 'exact', head: true })
        .gte('changed_at', monthAgo.toISOString())

      // Get most common transitions
      const { data: transitionData } = await this.supabase
        .from('patient_status_history')
        .select('from_status, to_status')

      const transitionCounts = new Map<string, number>()
      transitionData?.forEach(row => {
        const key = `${row.from_status || 'null'}->${row.to_status}`
        transitionCounts.set(key, (transitionCounts.get(key) || 0) + 1)
      })

      const mostCommonTransitions = Array.from(transitionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, count]) => {
          const [fromStatus, toStatus] = key.split('->')
          return {
            fromStatus: fromStatus === 'null' ? null : fromStatus as PatientStatus,
            toStatus: toStatus as PatientStatus,
            count
          }
        })

      return {
        statusCounts,
        transitionsToday: transitionsToday || 0,
        transitionsThisWeek: transitionsThisWeek || 0,
        transitionsThisMonth: transitionsThisMonth || 0,
        mostCommonTransitions
      }
    } catch (error) {
      throw new Error(`Statistics retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async count(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('patient_status_history')
        .select('*', { count: 'exact', head: true })

      if (error) {
        throw new Error(`Failed to count status transitions: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      throw new Error(`Status transition count failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async countByPatient(patientId: PatientId): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('patient_status_history')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)

      if (error) {
        throw new Error(`Failed to count patient status transitions: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      throw new Error(`Patient status transition count failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async countByStatus(status: PatientStatus): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('patient_status_history')
        .select('*', { count: 'exact', head: true })
        .eq('to_status', status)

      if (error) {
        throw new Error(`Failed to count status transitions by status: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      throw new Error(`Status transition count by status failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteByPatient(patientId: PatientId): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('patient_status_history')
        .delete()
        .eq('patient_id', patientId)

      if (error) {
        throw new Error(`Failed to delete patient status history: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Patient status history deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getAverageTimeInStatus(patientId?: PatientId): Promise<Record<PatientStatus, number>> {
    try {
      // This is a complex calculation that would require analyzing transition patterns
      // For now, we'll return a simplified implementation
      const averageTimes: Record<PatientStatus, number> = {} as any
      
      for (const status of Object.values(PatientStatus)) {
        // In a real implementation, this would calculate the actual average time
        // by analyzing consecutive transitions and their timestamps
        averageTimes[status] = 30 // Placeholder: 30 days
      }

      return averageTimes
    } catch (error) {
      throw new Error(`Average time calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getTransitionPatterns(): Promise<Array<{
    fromStatus: PatientStatus | null
    toStatus: PatientStatus
    count: number
    averageDuration: number
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('patient_status_history')
        .select('from_status, to_status, changed_at')
        .order('changed_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to get transition patterns: ${error.message}`)
      }

      // Group transitions by pattern
      const patterns = new Map<string, {
        count: number
        durations: number[]
      }>()

      data?.forEach(row => {
        const key = `${row.from_status || 'null'}->${row.to_status}`
        if (!patterns.has(key)) {
          patterns.set(key, { count: 0, durations: [] })
        }
        patterns.get(key)!.count++
      })

      // Convert to result format
      return Array.from(patterns.entries()).map(([key, data]) => {
        const [fromStatus, toStatus] = key.split('->')
        return {
          fromStatus: fromStatus === 'null' ? null : fromStatus as PatientStatus,
          toStatus: toStatus as PatientStatus,
          count: data.count,
          averageDuration: data.durations.length > 0 
            ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length 
            : 0
        }
      })
    } catch (error) {
      throw new Error(`Transition patterns retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods
  private mapToStatusTransition(row: any): StatusTransition {
    return {
      id: row.id,
      patientId: row.patient_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      reason: row.reason,
      timestamp: new Date(row.changed_at),
      changedBy: row.changed_by
    }
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      timestamp: 'changed_at',
      patientId: 'patient_id',
      fromStatus: 'from_status',
      toStatus: 'to_status'
    }

    return columnMap[sortBy] || 'changed_at'
  }
}