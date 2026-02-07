// ============================================================================
// STATUS TRANSITION VALIDATION PROPERTY TESTS
// Property-based tests for patient status transition validation
// Feature: patient-management-system, Property 8: Status Transition Validation
// **Validates: Requirements 3.1, 3.2, 3.6**
// ============================================================================

import * as fc from 'fast-check'
import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import { PatientStatus, PatientStatusType, PatientStatusValues } from '../../domain/value-objects/PatientStatus'
import { UserId } from '../../domain/value-objects/UserId'
import { PersonalInformation } from '../../domain/value-objects/PersonalInformation'
import { ContactInformation } from '../../domain/value-objects/ContactInformation'
import { EmergencyContact } from '../../domain/value-objects/EmergencyContact'
import { InsuranceInformation } from '../../domain/value-objects/InsuranceInformation'
import { IPatientRepository, UpdatePatientRequest, SearchCriteria, PaginationOptions, PaginatedResult } from '../../infrastructure/repositories/IPatientRepository'
import { IStatusHistoryRepository, StatusHistorySearchCriteria, StatusHistoryPaginationOptions, StatusHistoryPaginatedResult, StatusStatisticsData } from '../../infrastructure/repositories/IStatusHistoryRepository'
import { StatusTracker, StatusTransition, StatusTransitionRequest } from '../../application/services/StatusTracker'
import {
  patientIdGenerator,
  userIdGenerator,
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  uuidGenerator
} from '../../testing/generators'

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

class InMemoryPatientRepository implements IPatientRepository {
  private patients: Map<string, Patient> = new Map()

  async create(patient: Patient): Promise<Patient> {
    this.patients.set(patient.id.value, patient)
    return patient
  }

  async update(id: PatientId, updates: UpdatePatientRequest): Promise<Patient> {
    const existing = this.patients.get(id.value)
    if (!existing) {
      throw new Error(`Patient with ID ${id.value} not found`)
    }

    let updated = existing
    
    if (updates.personalInfo) {
      updated = updated.updatePersonalInfo(updates.personalInfo)
    }
    
    if (updates.status) {
      updated = new Patient(
        updated.id,
        updated.personalInfo,
        updated.contactInfo,
        updated.emergencyContact,
        updated.insuranceInfo,
        updates.status,
        updated.createdAt,
        new Date(),
        updated.createdBy
      )
    }

    this.patients.set(id.value, updated)
    return updated
  }

  async findById(id: PatientId): Promise<Patient | null> {
    return this.patients.get(id.value) || null
  }

  async search(criteria: SearchCriteria, pagination: PaginationOptions): Promise<PaginatedResult<Patient>> {
    let patients = Array.from(this.patients.values())

    if (criteria.status) {
      patients = patients.filter(p => p.status.value === criteria.status!.value)
    }

    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = patients.slice(start, end)

    return {
      data: paginatedData,
      total: patients.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(patients.length / pagination.limit),
      hasNext: end < patients.length,
      hasPrevious: pagination.page > 1
    }
  }

  async delete(id: PatientId): Promise<void> {
    this.patients.delete(id.value)
  }

  async exists(id: PatientId): Promise<boolean> {
    return this.patients.has(id.value)
  }

  async count(): Promise<number> {
    return this.patients.size
  }

  async findByStatus(status: PatientStatus, pagination: PaginationOptions): Promise<PaginatedResult<Patient>> {
    return this.search({ status }, pagination)
  }

  async findByCPF(cpf: string): Promise<Patient | null> {
    return Array.from(this.patients.values()).find(p => p.personalInfo.cpf.value === cpf) || null
  }

  async findByEmail(email: string): Promise<Patient | null> {
    return Array.from(this.patients.values()).find(p => p.contactInfo.email?.value === email) || null
  }

  async findByPhone(phone: string): Promise<Patient | null> {
    return Array.from(this.patients.values()).find(p => 
      p.contactInfo.primaryPhone.value === phone || 
      p.contactInfo.secondaryPhone?.value === phone
    ) || null
  }

  async findDuplicates(patient: Patient): Promise<Patient[]> {
    return []
  }

  async mergePatients(primaryId: PatientId, duplicateId: PatientId): Promise<Patient> {
    const primary = this.patients.get(primaryId.value)
    if (!primary) {
      throw new Error('Primary patient not found')
    }
    this.patients.delete(duplicateId.value)
    return primary
  }

  clear(): void {
    this.patients.clear()
  }
}

class InMemoryStatusHistoryRepository implements IStatusHistoryRepository {
  private transitions: Map<string, StatusTransition> = new Map()

  async create(transition: StatusTransition): Promise<StatusTransition> {
    this.transitions.set(transition.id, transition)
    return transition
  }

  async findById(id: string): Promise<StatusTransition | null> {
    return this.transitions.get(id) || null
  }

  async findByPatientId(
    patientId: PatientId,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult> {
    const transitions = Array.from(this.transitions.values())
      .filter(t => t.patientId.value === patientId.value)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = transitions.slice(start, end)

    return {
      data: paginatedData,
      total: transitions.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(transitions.length / pagination.limit),
      hasNext: end < transitions.length,
      hasPrevious: pagination.page > 1
    }
  }

  async search(
    criteria: StatusHistorySearchCriteria,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult> {
    let transitions = Array.from(this.transitions.values())

    if (criteria.patientId) {
      transitions = transitions.filter(t => t.patientId.value === criteria.patientId!.value)
    }

    if (criteria.toStatus) {
      transitions = transitions.filter(t => t.toStatus === criteria.toStatus!.value)
    }

    if (criteria.changedBy) {
      transitions = transitions.filter(t => t.changedBy.value === criteria.changedBy!.value)
    }

    if (criteria.changedAfter) {
      transitions = transitions.filter(t => t.timestamp >= criteria.changedAfter!)
    }

    if (criteria.changedBefore) {
      transitions = transitions.filter(t => t.timestamp <= criteria.changedBefore!)
    }

    // Sort by timestamp descending
    transitions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = transitions.slice(start, end)

    return {
      data: paginatedData,
      total: transitions.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(transitions.length / pagination.limit),
      hasNext: end < transitions.length,
      hasPrevious: pagination.page > 1
    }
  }

  async getLatestTransition(patientId: PatientId): Promise<StatusTransition | null> {
    const transitions = Array.from(this.transitions.values())
      .filter(t => t.patientId.value === patientId.value)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return transitions[0] || null
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination: StatusHistoryPaginationOptions
  ): Promise<StatusHistoryPaginatedResult> {
    return this.search(
      { changedAfter: startDate, changedBefore: endDate },
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
    const statusCounts: Record<string, number> = {}
    
    for (const transition of this.transitions.values()) {
      statusCounts[transition.toStatus] = (statusCounts[transition.toStatus] || 0) + 1
    }

    return {
      statusCounts,
      transitionsToday: 0,
      transitionsThisWeek: 0,
      transitionsThisMonth: 0,
      mostCommonTransitions: []
    }
  }

  async count(): Promise<number> {
    return this.transitions.size
  }

  async countByPatient(patientId: PatientId): Promise<number> {
    return Array.from(this.transitions.values())
      .filter(t => t.patientId.value === patientId.value)
      .length
  }

  async countByStatus(status: PatientStatus): Promise<number> {
    return Array.from(this.transitions.values())
      .filter(t => t.toStatus === status.value)
      .length
  }

  async deleteByPatient(patientId: PatientId): Promise<void> {
    for (const [id, transition] of this.transitions.entries()) {
      if (transition.patientId.value === patientId.value) {
        this.transitions.delete(id)
      }
    }
  }

  async getAverageTimeInStatus(patientId?: PatientId): Promise<Record<string, number>> {
    return {
      'new': 0,
      'active': 0,
      'on_hold': 0,
      'discharged': 0,
      'inactive': 0
    }
  }

  async getTransitionPatterns(): Promise<Array<{
    fromStatus: PatientStatus | null
    toStatus: PatientStatus
    count: number
    averageDuration: number
  }>> {
    return []
  }

  clear(): void {
    this.transitions.clear()
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

// Generator for valid status transitions
const validStatusTransitionGenerator = (): fc.Arbitrary<{
  fromStatus: PatientStatusType
  toStatus: PatientStatusType
  requiresReason: boolean
}> => {
  return fc.constantFrom(
    // From NEW
    { fromStatus: PatientStatusValues.NEW, toStatus: PatientStatusValues.ACTIVE, requiresReason: false },
    { fromStatus: PatientStatusValues.NEW, toStatus: PatientStatusValues.INACTIVE, requiresReason: true },
    
    // From ACTIVE
    { fromStatus: PatientStatusValues.ACTIVE, toStatus: PatientStatusValues.ON_HOLD, requiresReason: true },
    { fromStatus: PatientStatusValues.ACTIVE, toStatus: PatientStatusValues.DISCHARGED, requiresReason: true },
    { fromStatus: PatientStatusValues.ACTIVE, toStatus: PatientStatusValues.INACTIVE, requiresReason: true },
    
    // From ON_HOLD
    { fromStatus: PatientStatusValues.ON_HOLD, toStatus: PatientStatusValues.ACTIVE, requiresReason: false },
    { fromStatus: PatientStatusValues.ON_HOLD, toStatus: PatientStatusValues.DISCHARGED, requiresReason: true },
    { fromStatus: PatientStatusValues.ON_HOLD, toStatus: PatientStatusValues.INACTIVE, requiresReason: true },
    
    // From DISCHARGED
    { fromStatus: PatientStatusValues.DISCHARGED, toStatus: PatientStatusValues.ACTIVE, requiresReason: true },
    { fromStatus: PatientStatusValues.DISCHARGED, toStatus: PatientStatusValues.INACTIVE, requiresReason: false },
    
    // From INACTIVE
    { fromStatus: PatientStatusValues.INACTIVE, toStatus: PatientStatusValues.ACTIVE, requiresReason: true }
  )
}

// Generator for invalid status transitions
const invalidStatusTransitionGenerator = (): fc.Arbitrary<{
  fromStatus: PatientStatusType
  toStatus: PatientStatusType
}> => {
  return fc.constantFrom(
    // Invalid transitions
    { fromStatus: PatientStatusValues.INACTIVE, toStatus: PatientStatusValues.NEW },
    { fromStatus: PatientStatusValues.DISCHARGED, toStatus: PatientStatusValues.NEW },
    { fromStatus: PatientStatusValues.ACTIVE, toStatus: PatientStatusValues.NEW },
    { fromStatus: PatientStatusValues.ON_HOLD, toStatus: PatientStatusValues.NEW },
    { fromStatus: PatientStatusValues.NEW, toStatus: PatientStatusValues.ON_HOLD },
    { fromStatus: PatientStatusValues.NEW, toStatus: PatientStatusValues.DISCHARGED }
  )
}

// Generator for status transition reason
const statusTransitionReasonGenerator = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 10, maxLength: 200 })
    .filter(s => s.trim().length >= 10)

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 8: Status Transition Validation', () => {
  let patientRepository: InMemoryPatientRepository
  let statusHistoryRepository: InMemoryStatusHistoryRepository
  let statusTracker: StatusTracker

  beforeEach(() => {
    patientRepository = new InMemoryPatientRepository()
    statusHistoryRepository = new InMemoryStatusHistoryRepository()
    statusTracker = new StatusTracker(patientRepository, statusHistoryRepository)
  })

  afterEach(() => {
    patientRepository.clear()
    statusHistoryRepository.clear()
  })

  test('Property 8.1: Valid status transitions are accepted and processed', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        validStatusTransitionGenerator(),
        statusTransitionReasonGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, transition, reason) => {
          // Create fresh repositories for this iteration
          const testPatientRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testPatientRepository, testStatusHistoryRepository)

          // Create a patient with the initial status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(transition.fromStatus),
            new Date(),
            new Date(),
            userId
          )
          
          await testPatientRepository.create(patient)

          // Attempt the status transition
          const request: StatusTransitionRequest = {
            patientId,
            newStatus: transition.toStatus,
            reason: transition.requiresReason ? reason : undefined,
            userId
          }

          const result = await testStatusTracker.changePatientStatus(request)

          // Verify the transition was successful
          expect(result).toBeDefined()
          expect(result.patientId.value).toBe(patientId.value)
          expect(result.fromStatus).toBe(transition.fromStatus)
          expect(result.toStatus).toBe(transition.toStatus)
          expect(result.changedBy.value).toBe(userId.value)
          expect(result.timestamp).toBeInstanceOf(Date)

          // Verify the patient status was updated
          const updatedPatient = await testPatientRepository.findById(patientId)
          expect(updatedPatient).not.toBeNull()
          expect(updatedPatient!.status.value).toBe(transition.toStatus)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 8.2: Invalid status transitions are rejected with appropriate errors', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        invalidStatusTransitionGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, transition) => {
          // Create fresh repositories for this iteration
          const testPatientRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testPatientRepository, testStatusHistoryRepository)

          // Create a patient with the initial status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(transition.fromStatus),
            new Date(),
            new Date(),
            userId
          )
          
          await testPatientRepository.create(patient)

          // Attempt the invalid status transition
          const request: StatusTransitionRequest = {
            patientId,
            newStatus: transition.toStatus,
            userId
          }

          // Verify the transition is rejected
          await expect(testStatusTracker.changePatientStatus(request)).rejects.toThrow()

          // Verify the patient status was NOT updated
          const unchangedPatient = await testPatientRepository.findById(patientId)
          expect(unchangedPatient).not.toBeNull()
          expect(unchangedPatient!.status.value).toBe(transition.fromStatus)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 8.3: Status transitions requiring reasons are rejected without reasons', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        validStatusTransitionGenerator().filter(t => t.requiresReason),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, transition) => {
          // Create fresh repositories for this iteration
          const testPatientRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testPatientRepository, testStatusHistoryRepository)

          // Create a patient with the initial status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(transition.fromStatus),
            new Date(),
            new Date(),
            userId
          )
          
          await testPatientRepository.create(patient)

          // Attempt the transition without a reason
          const request: StatusTransitionRequest = {
            patientId,
            newStatus: transition.toStatus,
            reason: undefined, // No reason provided
            userId
          }

          // Verify the transition is rejected
          await expect(testStatusTracker.changePatientStatus(request)).rejects.toThrow(/requires a reason/i)

          // Verify the patient status was NOT updated
          const unchangedPatient = await testPatientRepository.findById(patientId)
          expect(unchangedPatient).not.toBeNull()
          expect(unchangedPatient!.status.value).toBe(transition.fromStatus)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 8.4: Status transitions update timestamps correctly', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        validStatusTransitionGenerator(),
        statusTransitionReasonGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, transition, reason) => {
          // Create fresh repositories for this iteration
          const testPatientRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testPatientRepository, testStatusHistoryRepository)

          // Create a patient with the initial status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(transition.fromStatus),
            new Date(),
            new Date(),
            userId
          )
          
          await testPatientRepository.create(patient)

          const beforeTransition = new Date()

          // Perform the status transition
          const request: StatusTransitionRequest = {
            patientId,
            newStatus: transition.toStatus,
            reason: transition.requiresReason ? reason : undefined,
            userId
          }

          const result = await testStatusTracker.changePatientStatus(request)

          const afterTransition = new Date()

          // Verify the timestamp is within the expected range
          expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTransition.getTime())
          expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTransition.getTime())

          // Verify the patient's updatedAt timestamp was updated
          const updatedPatient = await testPatientRepository.findById(patientId)
          expect(updatedPatient).not.toBeNull()
          expect(updatedPatient!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTransition.getTime())

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 8.5: Status history is maintained for all transitions', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        statusTransitionReasonGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, reason) => {
          // Create fresh repositories for this iteration
          const testPatientRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testPatientRepository, testStatusHistoryRepository)

          // Create a patient with NEW status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(PatientStatusValues.NEW),
            new Date(),
            new Date(),
            userId
          )
          
          await testPatientRepository.create(patient)

          // Perform a predefined sequence of valid transitions
          const transitions = [
            { fromStatus: PatientStatusValues.NEW, toStatus: PatientStatusValues.ACTIVE, requiresReason: false },
            { fromStatus: PatientStatusValues.ACTIVE, toStatus: PatientStatusValues.ON_HOLD, requiresReason: true },
            { fromStatus: PatientStatusValues.ON_HOLD, toStatus: PatientStatusValues.ACTIVE, requiresReason: false }
          ]

          // Perform the transitions with small delays to ensure distinct timestamps
          for (const transition of transitions) {
            const request: StatusTransitionRequest = {
              patientId,
              newStatus: transition.toStatus,
              reason: transition.requiresReason ? reason : undefined,
              userId
            }

            await testStatusTracker.changePatientStatus(request)
            // Small delay to ensure distinct timestamps
            await new Promise(resolve => setTimeout(resolve, 10))
          }

          // Verify the status history
          const history = await testStatusTracker.getPatientStatusHistory(patientId, 100)

          // Verify all transitions are recorded
          expect(history.length).toBe(transitions.length)

          // Verify the transitions are in reverse chronological order (most recent first)
          for (let i = 1; i < history.length; i++) {
            expect(history[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(history[i].timestamp.getTime())
          }

          // Verify each transition matches the expected sequence (in reverse order)
          for (let i = 0; i < transitions.length; i++) {
            const expectedTransition = transitions[transitions.length - 1 - i]
            const actualTransition = history[i]
            
            expect(actualTransition.toStatus).toBe(expectedTransition.toStatus)
            expect(actualTransition.fromStatus).toBe(expectedTransition.fromStatus)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 8.6: Status transitions maintain referential integrity with patient records', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        validStatusTransitionGenerator(),
        statusTransitionReasonGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, transition, reason) => {
          // Create fresh repositories for this iteration
          const testPatientRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testPatientRepository, testStatusHistoryRepository)

          // Create a patient with the initial status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(transition.fromStatus),
            new Date(),
            new Date(),
            userId
          )
          
          await testPatientRepository.create(patient)

          // Perform the status transition
          const request: StatusTransitionRequest = {
            patientId,
            newStatus: transition.toStatus,
            reason: transition.requiresReason ? reason : undefined,
            userId
          }

          const transitionResult = await testStatusTracker.changePatientStatus(request)

          // Verify the transition references the correct patient
          expect(transitionResult.patientId.value).toBe(patientId.value)

          // Verify the patient can be retrieved using the ID from the transition
          const retrievedPatient = await testPatientRepository.findById(transitionResult.patientId)
          expect(retrievedPatient).not.toBeNull()
          expect(retrievedPatient!.id.value).toBe(patientId.value)

          // Verify the patient's current status matches the transition's target status
          expect(retrievedPatient!.status.value).toBe(transitionResult.toStatus)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 8.7: Concurrent status transitions are handled correctly', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        personalInformationGenerator(),
        contactInformationGenerator(),
        emergencyContactGenerator(),
        insuranceInformationGenerator(),
        userIdGenerator(),
        statusTransitionReasonGenerator(),
        async (patientId, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, reason) => {
          // Create fresh repositories for this iteration
          const testPatientRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testPatientRepository, testStatusHistoryRepository)

          // Create a patient with ACTIVE status
          const patient = new Patient(
            patientId,
            personalInfo,
            contactInfo,
            emergencyContact,
            insuranceInfo,
            new PatientStatus(PatientStatusValues.ACTIVE),
            new Date(),
            new Date(),
            userId
          )
          
          await testPatientRepository.create(patient)

          // Attempt two concurrent transitions
          const request1: StatusTransitionRequest = {
            patientId,
            newStatus: PatientStatusValues.ON_HOLD,
            reason,
            userId
          }

          const request2: StatusTransitionRequest = {
            patientId,
            newStatus: PatientStatusValues.DISCHARGED,
            reason,
            userId
          }

          // Execute transitions concurrently
          const results = await Promise.allSettled([
            testStatusTracker.changePatientStatus(request1),
            testStatusTracker.changePatientStatus(request2)
          ])

          // At least one should succeed
          const successCount = results.filter(r => r.status === 'fulfilled').length
          expect(successCount).toBeGreaterThanOrEqual(1)

          // Verify the patient has a valid final status
          // The final status could be ACTIVE (if both failed), ON_HOLD, or DISCHARGED
          const finalPatient = await testPatientRepository.findById(patientId)
          expect(finalPatient).not.toBeNull()
          expect([PatientStatusValues.ACTIVE, PatientStatusValues.ON_HOLD, PatientStatusValues.DISCHARGED]).toContain(finalPatient!.status.value)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
