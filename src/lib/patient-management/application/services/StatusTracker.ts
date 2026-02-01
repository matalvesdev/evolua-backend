// ============================================================================
// STATUS TRACKER SERVICE
// Service layer for managing patient status transitions and lifecycle
// ============================================================================

import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { PatientStatus, PatientStatusType, PatientStatusValues } from '../../domain/value-objects/PatientStatus'
import { Patient } from '../../domain/entities/Patient'
import { IPatientRepository } from '../../infrastructure/repositories/IPatientRepository'
import { IStatusHistoryRepository } from '../../infrastructure/repositories/IStatusHistoryRepository'

// Status transition interfaces
export interface StatusTransition {
  id: string
  patientId: PatientId
  fromStatus: PatientStatusType | null
  toStatus: PatientStatusType
  reason?: string
  timestamp: Date
  changedBy: UserId
}

export interface StatusTransitionRequest {
  patientId: PatientId
  newStatus: PatientStatusType
  reason?: string
  userId: UserId
}

export interface StatusHistoryQuery {
  patientId?: PatientId
  fromDate?: Date
  toDate?: Date
  status?: PatientStatusType
  userId?: UserId
  limit?: number
  offset?: number
}

export interface StatusStatistics {
  totalPatients: number
  statusCounts: Record<PatientStatusType, number>
  recentTransitions: StatusTransition[]
  averageTimeInStatus: Record<PatientStatusType, number> // in days
}

export interface StatusFilterCriteria {
  status?: PatientStatusType[]
  changedAfter?: Date
  changedBefore?: Date
  changedBy?: UserId
  hasReason?: boolean
}

// Status transition validation rules
export interface StatusTransitionRule {
  fromStatus: PatientStatusType | null
  toStatus: PatientStatusType
  isAllowed: boolean
  requiresReason: boolean
  requiredRole?: string[]
  description: string
}

/**
 * Status Tracker Service
 * 
 * Manages patient status transitions, validates status changes,
 * maintains status history, and provides status-based filtering.
 * 
 * Requirements: 3.1, 3.2, 3.5, 3.6
 */
export class StatusTracker {
  private transitionRules: StatusTransitionRule[] = []

  constructor(
    private readonly patientRepository: IPatientRepository,
    private readonly statusHistoryRepository: IStatusHistoryRepository
  ) {
    this.initializeTransitionRules()
  }

  /**
   * Change patient status with validation
   * @param request - Status transition request
   * @returns Promise resolving to the status transition record
   */
  async changePatientStatus(request: StatusTransitionRequest): Promise<StatusTransition> {
    try {
      // Get current patient to check current status
      const patient = await this.patientRepository.findById(request.patientId)
      if (!patient) {
        throw new Error('Patient not found')
      }

      const currentStatus = patient.status.value
      
      // Validate the status transition
      await this.validateStatusTransition(currentStatus, request.newStatus, request.reason)

      // Update patient status
      await this.patientRepository.update(request.patientId, {
        status: new PatientStatus(request.newStatus)
      })

      // Create status transition record
      const transition: StatusTransition = {
        id: this.generateTransitionId(),
        patientId: request.patientId,
        fromStatus: currentStatus,
        toStatus: request.newStatus,
        reason: request.reason,
        timestamp: new Date(),
        changedBy: request.userId
      }

      // Store the transition in history
      await this.statusHistoryRepository.create(transition)

      return transition
    } catch (error) {
      throw new Error(`Status change failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get status history for a patient
   * @param patientId - Patient ID
   * @param limit - Maximum number of records to return
   * @returns Promise resolving to array of status transitions
   */
  async getPatientStatusHistory(patientId: PatientId, limit: number = 50): Promise<StatusTransition[]> {
    try {
      return await this.getStatusHistory({ patientId, limit })
    } catch (error) {
      throw new Error(`Status history retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get status history with filtering
   * @param query - Status history query parameters
   * @returns Promise resolving to array of status transitions
   */
  async getStatusHistory(query: StatusHistoryQuery): Promise<StatusTransition[]> {
    try {
      const criteria = {
        patientId: query.patientId,
        changedBy: query.userId,
        changedAfter: query.fromDate,
        changedBefore: query.toDate,
        toStatus: query.status ? new PatientStatus(query.status) : undefined
      }

      const pagination = {
        page: 1,
        limit: query.limit || 50,
        sortBy: 'timestamp' as const,
        sortOrder: 'desc' as const
      }

      const result = await this.statusHistoryRepository.search(criteria, pagination)
      return result.data
    } catch (error) {
      throw new Error(`Status history query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get patients by status with filtering
   * @param status - Patient status to filter by
   * @param additionalCriteria - Additional filtering criteria
   * @returns Promise resolving to array of patients
   */
  async getPatientsByStatus(
    status: PatientStatusType,
    additionalCriteria?: StatusFilterCriteria
  ): Promise<Patient[]> {
    try {
      const searchCriteria = { status: new PatientStatus(status) }
      
      if (additionalCriteria?.changedAfter) {
        // Note: This would need to be implemented in the repository to filter by update date
        // For now, we'll just use the basic status filter
      }
      
      if (additionalCriteria?.changedBefore) {
        // Note: This would need to be implemented in the repository to filter by update date
        // For now, we'll just use the basic status filter
      }

      const result = await this.patientRepository.search(searchCriteria, {
        page: 1,
        limit: 100,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      })

      return result.data
    } catch (error) {
      throw new Error(`Status-based patient search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get status statistics
   * @returns Promise resolving to status statistics
   */
  async getStatusStatistics(): Promise<StatusStatistics> {
    try {
      const totalPatients = await this.patientRepository.count()
      
      // Get statistics from the status history repository
      const stats = await this.statusHistoryRepository.getStatistics()
      
      // Get recent transitions (last 10)
      const recentTransitions = await this.getStatusHistory({ limit: 10 })

      // Get average time in status
      const averageTimeInStatus = await this.statusHistoryRepository.getAverageTimeInStatus()

      return {
        totalPatients,
        statusCounts: this.convertStatusCounts(stats.statusCounts),
        recentTransitions,
        averageTimeInStatus: this.convertAverageTimeInStatus(averageTimeInStatus)
      }
    } catch (error) {
      throw new Error(`Status statistics retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate if a status transition is allowed
   * @param fromStatus - Current status
   * @param toStatus - Target status
   * @param reason - Reason for transition
   * @returns Promise resolving to validation result
   */
  async validateStatusTransition(
    fromStatus: PatientStatusType | null,
    toStatus: PatientStatusType,
    reason?: string
  ): Promise<void> {
    const rule = this.transitionRules.find(
      r => r.fromStatus === fromStatus && r.toStatus === toStatus
    )

    if (!rule) {
      throw new Error(`Status transition from ${fromStatus} to ${toStatus} is not defined`)
    }

    if (!rule.isAllowed) {
      throw new Error(`Status transition from ${fromStatus} to ${toStatus} is not allowed: ${rule.description}`)
    }

    if (rule.requiresReason && (!reason || !reason.trim())) {
      throw new Error(`Status transition from ${fromStatus} to ${toStatus} requires a reason`)
    }
  }

  /**
   * Get allowed status transitions for a given status
   * @param currentStatus - Current patient status
   * @returns Array of allowed target statuses
   */
  getAllowedTransitions(currentStatus: PatientStatusType | null): PatientStatusType[] {
    return this.transitionRules
      .filter(rule => rule.fromStatus === currentStatus && rule.isAllowed)
      .map(rule => rule.toStatus)
  }

  /**
   * Check if a specific transition requires a reason
   * @param fromStatus - Current status
   * @param toStatus - Target status
   * @returns Boolean indicating if reason is required
   */
  requiresReason(fromStatus: PatientStatusType | null, toStatus: PatientStatusType): boolean {
    const rule = this.transitionRules.find(
      r => r.fromStatus === fromStatus && r.toStatus === toStatus
    )
    return rule?.requiresReason || false
  }

  // Private helper methods

  private initializeTransitionRules(): void {
    this.transitionRules = [
      // From null (new patient creation)
      {
        fromStatus: null,
        toStatus: PatientStatusValues.NEW,
        isAllowed: true,
        requiresReason: false,
        description: 'Initial patient registration'
      },

      // From NEW
      {
        fromStatus: PatientStatusValues.NEW,
        toStatus: PatientStatusValues.ACTIVE,
        isAllowed: true,
        requiresReason: false,
        description: 'Patient becomes active after initial assessment'
      },
      {
        fromStatus: PatientStatusValues.NEW,
        toStatus: PatientStatusValues.INACTIVE,
        isAllowed: true,
        requiresReason: true,
        description: 'Patient marked inactive before becoming active'
      },

      // From ACTIVE
      {
        fromStatus: PatientStatusValues.ACTIVE,
        toStatus: PatientStatusValues.ON_HOLD,
        isAllowed: true,
        requiresReason: true,
        description: 'Patient treatment temporarily suspended'
      },
      {
        fromStatus: PatientStatusValues.ACTIVE,
        toStatus: PatientStatusValues.DISCHARGED,
        isAllowed: true,
        requiresReason: true,
        description: 'Patient treatment completed successfully'
      },
      {
        fromStatus: PatientStatusValues.ACTIVE,
        toStatus: PatientStatusValues.INACTIVE,
        isAllowed: true,
        requiresReason: true,
        description: 'Patient no longer receiving treatment'
      },

      // From ON_HOLD
      {
        fromStatus: PatientStatusValues.ON_HOLD,
        toStatus: PatientStatusValues.ACTIVE,
        isAllowed: true,
        requiresReason: false,
        description: 'Patient treatment resumed'
      },
      {
        fromStatus: PatientStatusValues.ON_HOLD,
        toStatus: PatientStatusValues.DISCHARGED,
        isAllowed: true,
        requiresReason: true,
        description: 'Patient discharged while on hold'
      },
      {
        fromStatus: PatientStatusValues.ON_HOLD,
        toStatus: PatientStatusValues.INACTIVE,
        isAllowed: true,
        requiresReason: true,
        description: 'Patient marked inactive from hold status'
      },

      // From DISCHARGED
      {
        fromStatus: PatientStatusValues.DISCHARGED,
        toStatus: PatientStatusValues.ACTIVE,
        isAllowed: true,
        requiresReason: true,
        description: 'Patient readmitted for treatment'
      },
      {
        fromStatus: PatientStatusValues.DISCHARGED,
        toStatus: PatientStatusValues.INACTIVE,
        isAllowed: true,
        requiresReason: false,
        description: 'Discharged patient marked inactive'
      },

      // From INACTIVE
      {
        fromStatus: PatientStatusValues.INACTIVE,
        toStatus: PatientStatusValues.ACTIVE,
        isAllowed: true,
        requiresReason: true,
        description: 'Inactive patient reactivated'
      },
      {
        fromStatus: PatientStatusValues.INACTIVE,
        toStatus: PatientStatusValues.NEW,
        isAllowed: false,
        requiresReason: false,
        description: 'Cannot revert inactive patient to new status'
      }
    ]
  }

  private generateTransitionId(): string {
    return `transition_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private convertStatusCounts(counts: Record<string, number>): Record<PatientStatusType, number> {
    return {
      [PatientStatusValues.NEW]: counts['new'] || 0,
      [PatientStatusValues.ACTIVE]: counts['active'] || 0,
      [PatientStatusValues.ON_HOLD]: counts['on_hold'] || 0,
      [PatientStatusValues.DISCHARGED]: counts['discharged'] || 0,
      [PatientStatusValues.INACTIVE]: counts['inactive'] || 0
    }
  }

  private convertAverageTimeInStatus(averages: Record<string, number>): Record<PatientStatusType, number> {
    return {
      [PatientStatusValues.NEW]: averages['new'] || 0,
      [PatientStatusValues.ACTIVE]: averages['active'] || 0,
      [PatientStatusValues.ON_HOLD]: averages['on_hold'] || 0,
      [PatientStatusValues.DISCHARGED]: averages['discharged'] || 0,
      [PatientStatusValues.INACTIVE]: averages['inactive'] || 0
    }
  }
}