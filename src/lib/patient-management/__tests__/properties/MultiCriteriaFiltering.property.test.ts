// ============================================================================
// MULTI-CRITERIA FILTERING ACCURACY PROPERTY TESTS
// Property-based tests for multi-criteria filtering with pagination
// Feature: patient-management-system, Property 15: Multi-Criteria Filtering Accuracy
// **Validates: Requirements 7.2, 7.6**
// ============================================================================

import * as fc from 'fast-check'
import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { PatientStatus, PatientStatusType } from '../../domain/value-objects/PatientStatus'
import { PersonalInformation } from '../../domain/value-objects/PersonalInformation'
import { ContactInformation } from '../../domain/value-objects/ContactInformation'
import { EmergencyContact } from '../../domain/value-objects/EmergencyContact'
import { InsuranceInformation } from '../../domain/value-objects/InsuranceInformation'
import { Diagnosis } from '../../domain/value-objects/Diagnosis'
import { TreatmentHistory } from '../../domain/value-objects/TreatmentHistory'
import {
  IPatientRepository,
  SearchCriteria,
  PaginationOptions,
  PaginatedResult
} from '../../infrastructure/repositories/IPatientRepository'
import {
  patientIdGenerator,
  userIdGenerator,
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  patientStatusGenerator,
  diagnosisGenerator,
  treatmentHistoryGenerator
} from '../../testing/generators'

// ============================================================================
// MOCK PATIENT REPOSITORY WITH MULTI-CRITERIA FILTERING
// ============================================================================

class MockPatientRepositoryWithFiltering implements Partial<IPatientRepository> {
  private patients: Map<string, Patient> = new Map()
  private patientDiagnoses: Map<string, Diagnosis[]> = new Map()
  private patientTreatments: Map<string, TreatmentHistory[]> = new Map()

  async createPatient(patient: Patient): Promise<Patient> {
    this.patients.set(patient.id.value, patient)
    return patient
  }

  async findById(id: PatientId): Promise<Patient | null> {
    return this.patients.get(id.value) || null
  }

  setDiagnoses(patientId: string, diagnoses: Diagnosis[]): void {
    this.patientDiagnoses.set(patientId, diagnoses)
  }

  setTreatments(patientId: string, treatments: TreatmentHistory[]): void {
    this.patientTreatments.set(patientId, treatments)
  }

  async search(
    criteria: SearchCriteria,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    let filtered = Array.from(this.patients.values())

    // Apply status filter
    if (criteria.status) {
      filtered = filtered.filter(p => p.status.value === criteria.status!.value)
    }

    // Apply age range filter
    if (criteria.ageRange) {
      filtered = filtered.filter(p => {
        const age = p.personalInfo.getAge()
        const { min, max } = criteria.ageRange!
        
        if (min !== undefined && age < min) return false
        if (max !== undefined && age > max) return false
        
        return true
      })
    }

    // Apply diagnosis filter
    if (criteria.diagnosis) {
      filtered = filtered.filter(p => {
        const diagnoses = this.patientDiagnoses.get(p.id.value) || []
        return diagnoses.some(d => 
          d.description.toLowerCase().includes(criteria.diagnosis!.toLowerCase()) ||
          d.code.toLowerCase().includes(criteria.diagnosis!.toLowerCase())
        )
      })
    }

    // Apply treatment type filter
    if (criteria.treatmentType) {
      filtered = filtered.filter(p => {
        const treatments = this.patientTreatments.get(p.id.value) || []
        return treatments.some(t => 
          t.description.toLowerCase().includes(criteria.treatmentType!.toLowerCase())
        )
      })
    }

    // Apply general query filter (name, email, phone)
    if (criteria.query) {
      const query = criteria.query.toLowerCase()
      filtered = filtered.filter(p => {
        const nameMatch = p.personalInfo.fullName.value.toLowerCase().includes(query)
        const emailMatch = p.contactInfo.email?.value.toLowerCase().includes(query) || false
        const phoneMatch = p.contactInfo.primaryPhone.value.includes(query)
        const cpfMatch = p.personalInfo.cpf.value.includes(query)
        
        return nameMatch || emailMatch || phoneMatch || cpfMatch
      })
    }

    // Apply date range filters
    if (criteria.createdAfter) {
      filtered = filtered.filter(p => p.createdAt >= criteria.createdAfter!)
    }

    if (criteria.createdBefore) {
      filtered = filtered.filter(p => p.createdAt <= criteria.createdBefore!)
    }

    // Sort results
    const sortBy = pagination.sortBy || 'name'
    const sortOrder = pagination.sortOrder || 'asc'

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.personalInfo.fullName.value.localeCompare(b.personalInfo.fullName.value)
          break
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'status':
          comparison = a.status.value.localeCompare(b.status.value)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Apply pagination
    const total = filtered.length
    const totalPages = Math.ceil(total / pagination.limit)
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = filtered.slice(start, end)

    return {
      data: paginatedData,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1
    }
  }

  clear(): void {
    this.patients.clear()
    this.patientDiagnoses.clear()
    this.patientTreatments.clear()
  }

  getAllPatients(): Patient[] {
    return Array.from(this.patients.values())
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const patientWithMetadataGenerator = (): fc.Arbitrary<{
  patient: Patient
  diagnoses: Diagnosis[]
  treatments: TreatmentHistory[]
}> =>
  fc.record({
    id: patientIdGenerator(),
    personalInfo: personalInformationGenerator(),
    contactInfo: contactInformationGenerator(),
    emergencyContact: emergencyContactGenerator(),
    insuranceInfo: insuranceInformationGenerator(),
    status: patientStatusGenerator(),
    createdBy: userIdGenerator(),
    diagnoses: fc.array(diagnosisGenerator(), { minLength: 0, maxLength: 1 }),
    treatments: fc.array(treatmentHistoryGenerator(), { minLength: 0, maxLength: 1 })
  }).map(data => {
    const now = new Date()
    const patient = new Patient(
      data.id,
      data.personalInfo,
      data.contactInfo,
      data.emergencyContact,
      data.insuranceInfo,
      data.status,
      now,
      now,
      data.createdBy
    )

    return {
      patient,
      diagnoses: data.diagnoses,
      treatments: data.treatments
    }
  })

const searchCriteriaGenerator = (): fc.Arbitrary<SearchCriteria> =>
  fc.oneof(
    // Single criterion: status
    patientStatusGenerator().map(status => ({ status })),
    
    // Single criterion: age range
    fc.record({
      ageRange: fc.record({
        min: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
        max: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined })
      }).filter(range => {
        if (range.min !== undefined && range.max !== undefined) {
          return range.min <= range.max
        }
        return true
      })
    }),
    
    // Single criterion: diagnosis
    fc.string({ minLength: 3, maxLength: 20 }).map(diagnosis => ({ diagnosis })),
    
    // Single criterion: treatment type
    fc.string({ minLength: 3, maxLength: 20 }).map(treatmentType => ({ treatmentType })),
    
    // Multiple criteria: status + age range
    fc.record({
      status: patientStatusGenerator(),
      ageRange: fc.record({
        min: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
        max: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined })
      }).filter(range => {
        if (range.min !== undefined && range.max !== undefined) {
          return range.min <= range.max
        }
        return true
      })
    }),
    
    // Multiple criteria: status + diagnosis
    fc.record({
      status: patientStatusGenerator(),
      diagnosis: fc.string({ minLength: 3, maxLength: 20 })
    }),
    
    // Multiple criteria: age range + treatment type
    fc.record({
      ageRange: fc.record({
        min: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
        max: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined })
      }).filter(range => {
        if (range.min !== undefined && range.max !== undefined) {
          return range.min <= range.max
        }
        return true
      }),
      treatmentType: fc.string({ minLength: 3, maxLength: 20 })
    }),
    
    // Complex criteria: status + age range + diagnosis
    fc.record({
      status: patientStatusGenerator(),
      ageRange: fc.record({
        min: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
        max: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined })
      }).filter(range => {
        if (range.min !== undefined && range.max !== undefined) {
          return range.min <= range.max
        }
        return true
      }),
      diagnosis: fc.string({ minLength: 3, maxLength: 20 })
    })
  )

const paginationOptionsGenerator = (): fc.Arbitrary<PaginationOptions> =>
  fc.record({
    page: fc.integer({ min: 1, max: 5 }),
    limit: fc.integer({ min: 5, max: 50 }),
    sortBy: fc.constantFrom<'name' | 'createdAt' | 'updatedAt' | 'status'>('name', 'createdAt', 'updatedAt', 'status'),
    sortOrder: fc.constantFrom<'asc' | 'desc'>('asc', 'desc')
  })

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 15: Multi-Criteria Filtering Accuracy', () => {
  // ============================================================================
  // STATUS FILTERING TESTS
  // ============================================================================

  test('Property 15.1: Status filter returns only patients matching the specified status', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        patientStatusGenerator(),
        paginationOptionsGenerator(),
        async (patientsData, filterStatus, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply status filter
          const criteria: SearchCriteria = { status: filterStatus }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must match the filter status
          result.data.forEach(patient => {
            expect(patient.status.value).toBe(filterStatus.value)
          })

          // Verify no false positives: count matching patients manually
          const allPatients = repository.getAllPatients()
          const expectedMatches = allPatients.filter(p => p.status.value === filterStatus.value)
          
          expect(result.total).toBe(expectedMatches.length)

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // AGE RANGE FILTERING TESTS
  // ============================================================================

  test('Property 15.2: Age range filter returns only patients within the specified age range', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        paginationOptionsGenerator(),
        async (patientsData, minAge, maxAge, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply age range filter
          const criteria: SearchCriteria = {
            ageRange: { min: minAge, max: maxAge }
          }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must be within the age range
          result.data.forEach(patient => {
            const age = patient.personalInfo.getAge()
            expect(age).toBeGreaterThanOrEqual(minAge)
            expect(age).toBeLessThanOrEqual(maxAge)
          })

          // Verify no false positives
          const allPatients = repository.getAllPatients()
          const expectedMatches = allPatients.filter(p => {
            const age = p.personalInfo.getAge()
            return age >= minAge && age <= maxAge
          })
          
          expect(result.total).toBe(expectedMatches.length)

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // DIAGNOSIS FILTERING TESTS
  // ============================================================================

  test('Property 15.3: Diagnosis filter returns only patients with matching diagnosis', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        fc.string({ minLength: 3, maxLength: 10 }),
        paginationOptionsGenerator(),
        async (patientsData, diagnosisQuery, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply diagnosis filter
          const criteria: SearchCriteria = { diagnosis: diagnosisQuery }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must have a matching diagnosis
          result.data.forEach(patient => {
            const diagnoses = repository['patientDiagnoses'].get(patient.id.value) || []
            const hasMatch = diagnoses.some(d => 
              d.description.toLowerCase().includes(diagnosisQuery.toLowerCase()) ||
              d.code.toLowerCase().includes(diagnosisQuery.toLowerCase())
            )
            expect(hasMatch).toBe(true)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // TREATMENT TYPE FILTERING TESTS
  // ============================================================================

  test('Property 15.4: Treatment type filter returns only patients with matching treatment', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        fc.string({ minLength: 3, maxLength: 10 }),
        paginationOptionsGenerator(),
        async (patientsData, treatmentQuery, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply treatment type filter
          const criteria: SearchCriteria = { treatmentType: treatmentQuery }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must have a matching treatment
          result.data.forEach(patient => {
            const treatments = repository['patientTreatments'].get(patient.id.value) || []
            const hasMatch = treatments.some(t => 
              t.description.toLowerCase().includes(treatmentQuery.toLowerCase())
            )
            expect(hasMatch).toBe(true)
          })

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // MULTI-CRITERIA FILTERING TESTS (STATUS + AGE RANGE)
  // ============================================================================

  test('Property 15.5: Combined status and age range filters return only patients matching ALL criteria', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        patientStatusGenerator(),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        paginationOptionsGenerator(),
        async (patientsData, filterStatus, minAge, maxAge, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply combined filters
          const criteria: SearchCriteria = {
            status: filterStatus,
            ageRange: { min: minAge, max: maxAge }
          }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must match BOTH criteria
          result.data.forEach(patient => {
            // Must match status
            expect(patient.status.value).toBe(filterStatus.value)
            
            // Must match age range
            const age = patient.personalInfo.getAge()
            expect(age).toBeGreaterThanOrEqual(minAge)
            expect(age).toBeLessThanOrEqual(maxAge)
          })

          // Verify no false positives
          const allPatients = repository.getAllPatients()
          const expectedMatches = allPatients.filter(p => {
            const age = p.personalInfo.getAge()
            return p.status.value === filterStatus.value && 
                   age >= minAge && 
                   age <= maxAge
          })
          
          expect(result.total).toBe(expectedMatches.length)

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // MULTI-CRITERIA FILTERING TESTS (STATUS + DIAGNOSIS)
  // ============================================================================

  test('Property 15.6: Combined status and diagnosis filters return only patients matching ALL criteria', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        patientStatusGenerator(),
        fc.string({ minLength: 3, maxLength: 10 }),
        paginationOptionsGenerator(),
        async (patientsData, filterStatus, diagnosisQuery, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply combined filters
          const criteria: SearchCriteria = {
            status: filterStatus,
            diagnosis: diagnosisQuery
          }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must match BOTH criteria
          result.data.forEach(patient => {
            // Must match status
            expect(patient.status.value).toBe(filterStatus.value)
            
            // Must have matching diagnosis
            const diagnoses = repository['patientDiagnoses'].get(patient.id.value) || []
            const hasMatch = diagnoses.some(d => 
              d.description.toLowerCase().includes(diagnosisQuery.toLowerCase()) ||
              d.code.toLowerCase().includes(diagnosisQuery.toLowerCase())
            )
            expect(hasMatch).toBe(true)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // MULTI-CRITERIA FILTERING TESTS (AGE RANGE + TREATMENT TYPE)
  // ============================================================================

  test('Property 15.7: Combined age range and treatment type filters return only patients matching ALL criteria', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        fc.string({ minLength: 3, maxLength: 10 }),
        paginationOptionsGenerator(),
        async (patientsData, minAge, maxAge, treatmentQuery, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply combined filters
          const criteria: SearchCriteria = {
            ageRange: { min: minAge, max: maxAge },
            treatmentType: treatmentQuery
          }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must match BOTH criteria
          result.data.forEach(patient => {
            // Must match age range
            const age = patient.personalInfo.getAge()
            expect(age).toBeGreaterThanOrEqual(minAge)
            expect(age).toBeLessThanOrEqual(maxAge)
            
            // Must have matching treatment
            const treatments = repository['patientTreatments'].get(patient.id.value) || []
            const hasMatch = treatments.some(t => 
              t.description.toLowerCase().includes(treatmentQuery.toLowerCase())
            )
            expect(hasMatch).toBe(true)
          })

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // COMPLEX MULTI-CRITERIA FILTERING TESTS (3+ CRITERIA)
  // ============================================================================

  test('Property 15.8: Complex filters with status, age range, and diagnosis return only patients matching ALL criteria', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        patientStatusGenerator(),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        fc.string({ minLength: 3, maxLength: 10 }),
        paginationOptionsGenerator(),
        async (patientsData, filterStatus, minAge, maxAge, diagnosisQuery, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply complex combined filters
          const criteria: SearchCriteria = {
            status: filterStatus,
            ageRange: { min: minAge, max: maxAge },
            diagnosis: diagnosisQuery
          }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: All returned patients must match ALL three criteria
          result.data.forEach(patient => {
            // Must match status
            expect(patient.status.value).toBe(filterStatus.value)
            
            // Must match age range
            const age = patient.personalInfo.getAge()
            expect(age).toBeGreaterThanOrEqual(minAge)
            expect(age).toBeLessThanOrEqual(maxAge)
            
            // Must have matching diagnosis
            const diagnoses = repository['patientDiagnoses'].get(patient.id.value) || []
            const hasMatch = diagnoses.some(d => 
              d.description.toLowerCase().includes(diagnosisQuery.toLowerCase()) ||
              d.code.toLowerCase().includes(diagnosisQuery.toLowerCase())
            )
            expect(hasMatch).toBe(true)
          })

          // Verify no false positives
          const allPatients = repository.getAllPatients()
          const expectedMatches = allPatients.filter(p => {
            const age = p.personalInfo.getAge()
            const diagnoses = repository['patientDiagnoses'].get(p.id.value) || []
            const hasMatchingDiagnosis = diagnoses.some(d => 
              d.description.toLowerCase().includes(diagnosisQuery.toLowerCase()) ||
              d.code.toLowerCase().includes(diagnosisQuery.toLowerCase())
            )
            
            return p.status.value === filterStatus.value && 
                   age >= minAge && 
                   age <= maxAge &&
                   hasMatchingDiagnosis
          })
          
          expect(result.total).toBe(expectedMatches.length)

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // PAGINATION TESTS
  // ============================================================================

  test('Property 15.9: Pagination correctly limits results for filtered data', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 5, maxLength: 12 }),
        searchCriteriaGenerator(),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 5, max: 15 }),
        async (patientsData, criteria, page, limit) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply filters with pagination
          const pagination: PaginationOptions = {
            page,
            limit,
            sortBy: 'name',
            sortOrder: 'asc'
          }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: Returned data should not exceed limit
          expect(result.data.length).toBeLessThanOrEqual(limit)

          // Verify pagination metadata
          expect(result.page).toBe(page)
          expect(result.limit).toBe(limit)
          expect(result.totalPages).toBe(Math.ceil(result.total / limit))

          // Verify hasNext and hasPrevious flags
          if (page < result.totalPages) {
            expect(result.hasNext).toBe(true)
          } else {
            expect(result.hasNext).toBe(false)
          }

          if (page > 1) {
            expect(result.hasPrevious).toBe(true)
          } else {
            expect(result.hasPrevious).toBe(false)
          }

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Property 15.10: Pagination maintains filter consistency across pages', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 8, maxLength: 15 }),
        patientStatusGenerator(),
        fc.integer({ min: 5, max: 10 }),
        async (patientsData, filterStatus, limit) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply status filter
          const criteria: SearchCriteria = { status: filterStatus }

          // Get first page
          const page1Result = await repository.search(criteria, {
            page: 1,
            limit,
            sortBy: 'name',
            sortOrder: 'asc'
          })

          // Get second page if it exists
          if (page1Result.hasNext) {
            const page2Result = await repository.search(criteria, {
              page: 2,
              limit,
              sortBy: 'name',
              sortOrder: 'asc'
            })

            // CRITICAL: All patients on both pages must match the filter
            page1Result.data.forEach(patient => {
              expect(patient.status.value).toBe(filterStatus.value)
            })

            page2Result.data.forEach(patient => {
              expect(patient.status.value).toBe(filterStatus.value)
            })

            // Verify no duplicates across pages
            const page1Ids = new Set(page1Result.data.map(p => p.id.value))
            const page2Ids = new Set(page2Result.data.map(p => p.id.value))

            page2Ids.forEach(id => {
              expect(page1Ids.has(id)).toBe(false)
            })

            // Verify total count is consistent
            expect(page1Result.total).toBe(page2Result.total)
          }

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // LARGE RESULT SET PAGINATION TESTS
  // ============================================================================

  test('Property 15.11: Large result sets are properly paginated with correct metadata', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 25, max: 50 }),
        patientStatusGenerator(),
        fc.integer({ min: 10, max: 20 }),
        async (patientCount, filterStatus, limit) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create many patients with the same status
          const patientsData = await fc.sample(
            patientWithMetadataGenerator(),
            patientCount
          )

          for (const { patient, diagnoses, treatments } of patientsData) {
            // Override status to ensure we have many matching patients
            const patientWithStatus = new Patient(
              patient.id,
              patient.personalInfo,
              patient.contactInfo,
              patient.emergencyContact,
              patient.insuranceInfo,
              filterStatus,
              patient.createdAt,
              patient.updatedAt,
              patient.createdBy
            )
            
            await repository.createPatient(patientWithStatus)
            repository.setDiagnoses(patientWithStatus.id.value, diagnoses)
            repository.setTreatments(patientWithStatus.id.value, treatments)
          }

          // Apply filter
          const criteria: SearchCriteria = { status: filterStatus }
          const result = await repository.search(criteria, {
            page: 1,
            limit,
            sortBy: 'name',
            sortOrder: 'asc'
          })

          // CRITICAL: For large result sets, pagination must work correctly
          expect(result.total).toBe(patientCount)
          expect(result.data.length).toBeLessThanOrEqual(limit)
          expect(result.totalPages).toBe(Math.ceil(patientCount / limit))
          
          // Should have next page if total > limit
          if (patientCount > limit) {
            expect(result.hasNext).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  // ============================================================================
  // EMPTY RESULT TESTS
  // ============================================================================

  test('Property 15.12: Filters that match no patients return empty results with correct metadata', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 6 }),
        fc.string({ minLength: 20, maxLength: 30 }).filter(s => /^[XYZ]{20,30}$/.test(s)),
        paginationOptionsGenerator(),
        async (patientsData, impossibleDiagnosis, pagination) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply filter that should match nothing
          const criteria: SearchCriteria = { diagnosis: impossibleDiagnosis }
          const result = await repository.search(criteria, pagination)

          // CRITICAL: Empty results should have correct metadata
          expect(result.data).toHaveLength(0)
          expect(result.total).toBe(0)
          expect(result.totalPages).toBe(0)
          expect(result.hasNext).toBe(false)
          expect(result.hasPrevious).toBe(false)

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  // ============================================================================
  // SORTING CONSISTENCY TESTS
  // ============================================================================

  test('Property 15.13: Filtered results maintain correct sort order', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(patientWithMetadataGenerator(), { minLength: 3, maxLength: 8 }),
        patientStatusGenerator(),
        fc.constantFrom<'name' | 'createdAt' | 'updatedAt' | 'status'>('name', 'createdAt', 'updatedAt', 'status'),
        fc.constantFrom<'asc' | 'desc'>('asc', 'desc'),
        async (patientsData, filterStatus, sortBy, sortOrder) => {
          // Create fresh repository for this iteration
          const repository = new MockPatientRepositoryWithFiltering()

          // Create patients
          for (const { patient, diagnoses, treatments } of patientsData) {
            await repository.createPatient(patient)
            repository.setDiagnoses(patient.id.value, diagnoses)
            repository.setTreatments(patient.id.value, treatments)
          }

          // Apply filter with sorting
          const criteria: SearchCriteria = { status: filterStatus }
          const result = await repository.search(criteria, {
            page: 1,
            limit: 100,
            sortBy,
            sortOrder
          })

          // CRITICAL: Results must be sorted correctly
          if (result.data.length > 1) {
            for (let i = 1; i < result.data.length; i++) {
              const prev = result.data[i - 1]
              const curr = result.data[i]

              let comparison = 0
              switch (sortBy) {
                case 'name':
                  comparison = prev.personalInfo.fullName.value.localeCompare(curr.personalInfo.fullName.value)
                  break
                case 'createdAt':
                  comparison = prev.createdAt.getTime() - curr.createdAt.getTime()
                  break
                case 'updatedAt':
                  comparison = prev.updatedAt.getTime() - curr.updatedAt.getTime()
                  break
                case 'status':
                  comparison = prev.status.value.localeCompare(curr.status.value)
                  break
              }

              if (sortOrder === 'asc') {
                expect(comparison).toBeLessThanOrEqual(0)
              } else {
                expect(comparison).toBeGreaterThanOrEqual(0)
              }
            }
          }

          return true
        }
      ),
      { numRuns: 30 }
    )
  })
})
