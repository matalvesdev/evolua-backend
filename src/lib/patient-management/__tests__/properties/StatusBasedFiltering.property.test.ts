// ============================================================================
// STATUS-BASED PATIENT FILTERING ACCURACY PROPERTY TESTS
// Property-based tests for status-based patient filtering
// Feature: patient-management-system, Property 9: Status-Based Patient Filtering Accuracy
// **Validates: Requirements 3.5**
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
import { StatusTracker } from '../../application/services/StatusTracker'
import { IStatusHistoryRepository, StatusHistorySearchCriteria, StatusHistoryPaginationOptions, StatusHistoryPaginatedResult, StatusStatisticsData } from '../../infrastructure/repositories/IStatusHistoryRepository'
import { StatusTransition } from '../../application/services/StatusTracker'
import {
  patientIdGenerator,
  userIdGenerator,
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  patientStatusGenerator
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

    // Apply status filter
    if (criteria.status) {
      patients = patients.filter(p => p.status.value === criteria.status!.value)
    }

    // Apply sorting
    if (pagination.sortBy === 'updatedAt') {
      patients.sort((a, b) => {
        const aTime = a.updatedAt.getTime()
        const bTime = b.updatedAt.getTime()
        return pagination.sortOrder === 'desc' ? bTime - aTime : aTime - bTime
      })
    } else if (pagination.sortBy === 'createdAt') {
      patients.sort((a, b) => {
        const aTime = a.createdAt.getTime()
        const bTime = b.createdAt.getTime()
        return pagination.sortOrder === 'desc' ? bTime - aTime : aTime - bTime
      })
    } else if (pagination.sortBy === 'name') {
      patients.sort((a, b) => {
        const aName = a.personalInfo.fullName.value.toLowerCase()
        const bName = b.personalInfo.fullName.value.toLowerCase()
        const comparison = aName.localeCompare(bName)
        return pagination.sortOrder === 'desc' ? -comparison : comparison
      })
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

  getAllPatients(): Patient[] {
    return Array.from(this.patients.values())
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

// Generator for a patient with a specific status
const patientWithStatusGenerator = (status: PatientStatusType): fc.Arbitrary<Patient> =>
  fc.tuple(
    patientIdGenerator(),
    personalInformationGenerator(),
    contactInformationGenerator(),
    emergencyContactGenerator(),
    insuranceInformationGenerator(),
    userIdGenerator()
  ).map(([id, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId]) =>
    new Patient(
      id,
      personalInfo,
      contactInfo,
      emergencyContact,
      insuranceInfo,
      new PatientStatus(status),
      new Date(),
      new Date(),
      userId
    )
  )

// Generator for a collection of patients with mixed statuses
const mixedStatusPatientsGenerator = (): fc.Arbitrary<Patient[]> =>
  fc.array(
    fc.tuple(
      patientIdGenerator(),
      personalInformationGenerator(),
      contactInformationGenerator(),
      emergencyContactGenerator(),
      insuranceInformationGenerator(),
      userIdGenerator(),
      patientStatusGenerator()
    ).map(([id, personalInfo, contactInfo, emergencyContact, insuranceInfo, userId, status]) =>
      new Patient(
        id,
        personalInfo,
        contactInfo,
        emergencyContact,
        insuranceInfo,
        status,
        new Date(),
        new Date(),
        userId
      )
    ),
    { minLength: 10, maxLength: 50 }
  )

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 9: Status-Based Patient Filtering Accuracy', () => {
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

  test('Property 9.1: Filtering by status returns only patients with that exact status', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PatientStatusType>(
          PatientStatusValues.NEW,
          PatientStatusValues.ACTIVE,
          PatientStatusValues.ON_HOLD,
          PatientStatusValues.DISCHARGED,
          PatientStatusValues.INACTIVE
        ),
        mixedStatusPatientsGenerator(),
        async (targetStatus, patients) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testRepository, testStatusHistoryRepository)

          // Add all patients to the repository
          for (const patient of patients) {
            await testRepository.create(patient)
          }

          // Count expected patients with target status
          const expectedCount = patients.filter(p => p.status.value === targetStatus).length

          // Query patients by status
          const result = await testStatusTracker.getPatientsByStatus(targetStatus)

          // Verify all returned patients have the target status
          for (const patient of result) {
            if (patient.status.value !== targetStatus) {
              console.error(`False positive: Patient ${patient.id.value} has status ${patient.status.value}, expected ${targetStatus}`)
              return false
            }
          }

          // Verify no false negatives (all patients with target status are returned)
          if (result.length !== expectedCount) {
            console.error(`Expected ${expectedCount} patients with status ${targetStatus}, but got ${result.length}`)
            return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9.2: Status filtering returns no false positives', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PatientStatusType>(
          PatientStatusValues.NEW,
          PatientStatusValues.ACTIVE,
          PatientStatusValues.ON_HOLD,
          PatientStatusValues.DISCHARGED,
          PatientStatusValues.INACTIVE
        ),
        mixedStatusPatientsGenerator(),
        async (targetStatus, patients) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testRepository, testStatusHistoryRepository)

          // Add all patients to the repository
          for (const patient of patients) {
            await testRepository.create(patient)
          }

          // Query patients by status
          const result = await testStatusTracker.getPatientsByStatus(targetStatus)

          // Verify NO patient in the result has a different status (no false positives)
          for (const patient of result) {
            if (patient.status.value !== targetStatus) {
              console.error(`False positive detected: Patient ${patient.id.value} has status ${patient.status.value}, but was returned for query ${targetStatus}`)
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9.3: Status filtering returns no false negatives', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PatientStatusType>(
          PatientStatusValues.NEW,
          PatientStatusValues.ACTIVE,
          PatientStatusValues.ON_HOLD,
          PatientStatusValues.DISCHARGED,
          PatientStatusValues.INACTIVE
        ),
        mixedStatusPatientsGenerator(),
        async (targetStatus, patients) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testRepository, testStatusHistoryRepository)

          // Add all patients to the repository
          for (const patient of patients) {
            await testRepository.create(patient)
          }

          // Get all patients with target status from the repository
          const expectedPatients = patients.filter(p => p.status.value === targetStatus)

          // Query patients by status
          const result = await testStatusTracker.getPatientsByStatus(targetStatus)

          // Verify all expected patients are in the result (no false negatives)
          for (const expectedPatient of expectedPatients) {
            const found = result.some(p => p.id.value === expectedPatient.id.value)
            if (!found) {
              console.error(`False negative detected: Patient ${expectedPatient.id.value} with status ${targetStatus} was not returned`)
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9.4: Status filtering with sorting maintains correct order', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PatientStatusType>(
          PatientStatusValues.NEW,
          PatientStatusValues.ACTIVE,
          PatientStatusValues.ON_HOLD,
          PatientStatusValues.DISCHARGED,
          PatientStatusValues.INACTIVE
        ),
        fc.array(
          patientWithStatusGenerator(PatientStatusValues.ACTIVE),
          { minLength: 5, maxLength: 20 }
        ),
        async (targetStatus, patients) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()

          // Add all patients with the same status but different update times
          for (let i = 0; i < patients.length; i++) {
            const patient = patients[i]
            // Create patient with specific status
            const patientWithStatus = new Patient(
              patient.id,
              patient.personalInfo,
              patient.contactInfo,
              patient.emergencyContact,
              patient.insuranceInfo,
              new PatientStatus(targetStatus),
              new Date(Date.now() - (patients.length - i) * 1000), // Different creation times
              new Date(Date.now() - (patients.length - i) * 1000), // Different update times
              patient.createdBy
            )
            await testRepository.create(patientWithStatus)
            // Small delay to ensure distinct timestamps
            await new Promise(resolve => setTimeout(resolve, 5))
          }

          // Query with sorting by updatedAt descending
          const result = await testRepository.search(
            { status: new PatientStatus(targetStatus) },
            { page: 1, limit: 100, sortBy: 'updatedAt', sortOrder: 'desc' }
          )

          // Verify results are sorted correctly (most recent first)
          for (let i = 1; i < result.data.length; i++) {
            const prevTime = result.data[i - 1].updatedAt.getTime()
            const currTime = result.data[i].updatedAt.getTime()
            
            if (prevTime < currTime) {
              console.error(`Sorting error: Patient at index ${i - 1} (${prevTime}) should be more recent than patient at index ${i} (${currTime})`)
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 9.5: Empty status filter returns empty result set', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PatientStatusType>(
          PatientStatusValues.NEW,
          PatientStatusValues.ACTIVE,
          PatientStatusValues.ON_HOLD,
          PatientStatusValues.DISCHARGED,
          PatientStatusValues.INACTIVE
        ),
        mixedStatusPatientsGenerator(),
        async (targetStatus, patients) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testRepository, testStatusHistoryRepository)

          // Add only patients that DON'T have the target status
          const patientsWithoutTargetStatus = patients.filter(p => p.status.value !== targetStatus)
          
          for (const patient of patientsWithoutTargetStatus) {
            await testRepository.create(patient)
          }

          // Query patients by the target status (which none have)
          const result = await testStatusTracker.getPatientsByStatus(targetStatus)

          // Verify result is empty
          if (result.length !== 0) {
            console.error(`Expected empty result for status ${targetStatus}, but got ${result.length} patients`)
            return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9.6: Status filtering is consistent across multiple queries', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PatientStatusType>(
          PatientStatusValues.NEW,
          PatientStatusValues.ACTIVE,
          PatientStatusValues.ON_HOLD,
          PatientStatusValues.DISCHARGED,
          PatientStatusValues.INACTIVE
        ),
        mixedStatusPatientsGenerator(),
        async (targetStatus, patients) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testRepository, testStatusHistoryRepository)

          // Add all patients to the repository
          for (const patient of patients) {
            await testRepository.create(patient)
          }

          // Query the same status multiple times
          const result1 = await testStatusTracker.getPatientsByStatus(targetStatus)
          const result2 = await testStatusTracker.getPatientsByStatus(targetStatus)
          const result3 = await testStatusTracker.getPatientsByStatus(targetStatus)

          // Verify all queries return the same number of patients
          if (result1.length !== result2.length || result2.length !== result3.length) {
            console.error(`Inconsistent results: ${result1.length}, ${result2.length}, ${result3.length}`)
            return false
          }

          // Verify all queries return the same patients (by ID)
          const ids1 = new Set(result1.map(p => p.id.value))
          const ids2 = new Set(result2.map(p => p.id.value))
          const ids3 = new Set(result3.map(p => p.id.value))

          for (const id of ids1) {
            if (!ids2.has(id) || !ids3.has(id)) {
              console.error(`Inconsistent patient IDs across queries`)
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9.7: Status filtering handles all valid status values correctly', () => {
    fc.assert(
      fc.asyncProperty(
        mixedStatusPatientsGenerator(),
        async (patients) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testRepository, testStatusHistoryRepository)

          // Add all patients to the repository
          for (const patient of patients) {
            await testRepository.create(patient)
          }

          // Query each status and verify results
          const allStatuses: PatientStatusType[] = [
            PatientStatusValues.NEW,
            PatientStatusValues.ACTIVE,
            PatientStatusValues.ON_HOLD,
            PatientStatusValues.DISCHARGED,
            PatientStatusValues.INACTIVE
          ]

          let totalRetrieved = 0

          for (const status of allStatuses) {
            const result = await testStatusTracker.getPatientsByStatus(status)
            const expectedCount = patients.filter(p => p.status.value === status).length

            // Verify count matches
            if (result.length !== expectedCount) {
              console.error(`Status ${status}: expected ${expectedCount}, got ${result.length}`)
              return false
            }

            // Verify all have correct status
            for (const patient of result) {
              if (patient.status.value !== status) {
                console.error(`Patient ${patient.id.value} has wrong status: ${patient.status.value} instead of ${status}`)
                return false
              }
            }

            totalRetrieved += result.length
          }

          // Verify we retrieved all patients exactly once
          if (totalRetrieved !== patients.length) {
            console.error(`Total retrieved (${totalRetrieved}) doesn't match total patients (${patients.length})`)
            return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9.8: Status filtering after status changes reflects current state', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          patientWithStatusGenerator(PatientStatusValues.NEW),
          { minLength: 5, maxLength: 15 }
        ),
        userIdGenerator(),
        async (patients, userId) => {
          // Create fresh repository for this iteration
          const testRepository = new InMemoryPatientRepository()
          const testStatusHistoryRepository = new InMemoryStatusHistoryRepository()
          const testStatusTracker = new StatusTracker(testRepository, testStatusHistoryRepository)

          // Add all patients with NEW status
          for (const patient of patients) {
            await testRepository.create(patient)
          }

          // Verify initial state
          const initialNewPatients = await testStatusTracker.getPatientsByStatus(PatientStatusValues.NEW)
          if (initialNewPatients.length !== patients.length) {
            console.error(`Initial state incorrect: expected ${patients.length} NEW patients, got ${initialNewPatients.length}`)
            return false
          }

          // Change half of the patients to ACTIVE status
          const halfCount = Math.floor(patients.length / 2)
          for (let i = 0; i < halfCount; i++) {
            await testStatusTracker.changePatientStatus({
              patientId: patients[i].id,
              newStatus: PatientStatusValues.ACTIVE,
              userId
            })
          }

          // Verify NEW status count decreased
          const newPatientsAfter = await testStatusTracker.getPatientsByStatus(PatientStatusValues.NEW)
          if (newPatientsAfter.length !== patients.length - halfCount) {
            console.error(`After status change: expected ${patients.length - halfCount} NEW patients, got ${newPatientsAfter.length}`)
            return false
          }

          // Verify ACTIVE status count increased
          const activePatients = await testStatusTracker.getPatientsByStatus(PatientStatusValues.ACTIVE)
          if (activePatients.length !== halfCount) {
            console.error(`After status change: expected ${halfCount} ACTIVE patients, got ${activePatients.length}`)
            return false
          }

          // Verify the changed patients are in ACTIVE, not NEW
          for (let i = 0; i < halfCount; i++) {
            const patientId = patients[i].id
            const inNew = newPatientsAfter.some(p => p.id.value === patientId.value)
            const inActive = activePatients.some(p => p.id.value === patientId.value)

            if (inNew) {
              console.error(`Patient ${patientId.value} still in NEW after status change`)
              return false
            }

            if (!inActive) {
              console.error(`Patient ${patientId.value} not in ACTIVE after status change`)
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
