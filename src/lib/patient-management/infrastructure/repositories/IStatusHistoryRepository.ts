// ============================================================================
// STATUS HISTORY REPOSITORY INTERFACE
// Repository interface for managing patient status history
// ============================================================================

import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { StatusTransition } from '../../application/services/StatusTracker'

export interface StatusHistorySearchCriteria {
  patientId?: PatientId
  fromStatus?: PatientStatus
  toStatus?: PatientStatus
  changedBy?: UserId
  changedAfter?: Date
  changedBefore?: Date
  hasReason?: boolean
}

export interface StatusHistoryPaginationOptions {
  page: number
  limit: number
  sortBy?: 'timestamp' | 'patientId' | 'fromStatus' | 'toStatus'
  sortOrder?: 'asc' | 'desc'
}

export interface StatusHistoryPaginatedResult {
  data: StatusTransition[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface StatusStatisticsData {
  statusCounts: Record<PatientStatus, number>
  transitionsToday: number
  transitionsThisWeek: number
  transitionsThisMonth: number
  mostCommonTransitions: Array<{
    fromStatus: PatientStatus | null
    toStatus: PatientStatus
    count: number
  }>
}

/**
 * Status History Repository Interface
 * 
 * Defines the contract for storing and retrieving patient status history.
 * Implementations should handle persistence of status transitions and
 * provide efficient querying capabilities.
 */
export interface IStatusHistoryRepository {
  /**
   * Create a new status transition record
   * @param transition - Status transition to record
   * @returns Promise resolving to the created transition
   */
  create(transition: StatusTransition): Promise<StatusTransition>

  /**
   * Find status transition by ID
   * @param id - Transition ID
   * @returns Promise resolving to transition or null if not found
   */
  findById(id: string): Promise<StatusTransition | null>

  /**
   * Find all status transitions for a patient
   * @param patientId - Patient ID
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated transitions
   */
  findByPatientId(
    patientId: PatientId,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult>

  /**
   * Search status transitions with criteria
   * @param criteria - Search criteria
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated search results
   */
  search(
    criteria: StatusHistorySearchCriteria,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult>

  /**
   * Get the latest status transition for a patient
   * @param patientId - Patient ID
   * @returns Promise resolving to latest transition or null
   */
  getLatestTransition(patientId: PatientId): Promise<StatusTransition | null>

  /**
   * Get status transitions within a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated transitions
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult>

  /**
   * Get status transitions by user
   * @param userId - User ID who made the changes
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated transitions
   */
  findByUser(
    userId: UserId,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult>

  /**
   * Get status statistics
   * @returns Promise resolving to status statistics
   */
  getStatistics(): Promise<StatusStatisticsData>

  /**
   * Count total status transitions
   * @returns Promise resolving to total count
   */
  count(): Promise<number>

  /**
   * Count status transitions for a specific patient
   * @param patientId - Patient ID
   * @returns Promise resolving to transition count
   */
  countByPatient(patientId: PatientId): Promise<number>

  /**
   * Count status transitions by status
   * @param status - Status to count transitions for
   * @returns Promise resolving to transition count
   */
  countByStatus(status: PatientStatus): Promise<number>

  /**
   * Delete status transitions for a patient (for LGPD compliance)
   * @param patientId - Patient ID
   * @returns Promise resolving when deletion is complete
   */
  deleteByPatient(patientId: PatientId): Promise<void>

  /**
   * Get average time spent in each status
   * @param patientId - Optional patient ID to filter by
   * @returns Promise resolving to average times in days
   */
  getAverageTimeInStatus(patientId?: PatientId): Promise<Record<PatientStatus, number>>

  /**
   * Get status transition patterns
   * @returns Promise resolving to common transition patterns
   */
  getTransitionPatterns(): Promise<Array<{
    fromStatus: PatientStatus | null
    toStatus: PatientStatus
    count: number
    averageDuration: number
  }>>
}