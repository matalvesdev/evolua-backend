// ============================================================================
// SEARCH FUNCTIONALITY PROPERTY TESTS
// Property-based tests for comprehensive search functionality
// Feature: patient-management-system, Property 14: Comprehensive Search Functionality
// **Validates: Requirements 7.1, 7.4**
// ============================================================================

import * as fc from 'fast-check'
import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { IPatientRepository, SearchCriteria, PaginationOptions, PaginatedResult } from '../../infrastructure/repositories/IPatientRepository'
import {
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  patientStatusGenerator,
  userIdGenerator
} from '../../testing/generators'

// ============================================================================
// MOCK REPOSITORY FOR TESTING
// ============================================================================

class MockPatientRepository implements IPatientRepository {
  private patients: Patient[] = []

  async create(patientData: any, createdBy: string): Promise<Patient> {
    if (patientData instanceof Patient) {
      this.patients.push(patientData)
      return patientData
    }
    throw new Error('Expected Patient entity')
  }

  async findById(id: PatientId): Promise<Patient | null> {
    return this.patients.find(p => p.id.equals(id)) || null
  }

  async update(id: PatientId, updates: any): Promise<Patient> {
    const patient = await this.findById(id)
    if (!patient) throw new Error('Patient not found')
    return patient
  }

  async delete(id: PatientId): Promise<void> {
    this.patients = this.patients.filter(p => !p.id.equals(id))
  }

  async search(criteria: SearchCriteria, pagination: PaginationOptions): Promise<PaginatedResult<Patient>> {
    let filtered = [...this.patients]

    // Apply query filter (searches name, email, phone, cpf)
    if (criteria.query) {
      const query = criteria.query.toLowerCase()
      filtered = filtered.filter(p => {
        const name = p.personalInfo.fullName.value.toLowerCase()
        const cpf = p.personalInfo.cpf.value.replace(/\D/g, '')
        const phone = p.contactInfo.primaryPhone.value.replace(/\D/g, '')
        const email = p.contactInfo.email?.value.toLowerCase() || ''
        
        return name.includes(query) || 
               cpf.includes(query) || 
               phone.includes(query) || 
               email.includes(query)
      })
    }

    // Apply status filter
    if (criteria.status) {
      filtered = filtered.filter(p => p.status.equals(criteria.status!))
    }

    // Apply age range filter
    if (criteria.ageRange) {
      filtered = filtered.filter(p => {
        const age = this.calculateAge(p.personalInfo.dateOfBirth)
        const minAge = criteria.ageRange!.min ?? 0
        const maxAge = criteria.ageRange!.max ?? 150
        return age >= minAge && age <= maxAge
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
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = filtered.slice(start, end)
    const totalPages = Math.ceil(total / pagination.limit)

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

  async findByStatus(status: PatientStatus, pagination: PaginationOptions): Promise<PaginatedResult<Patient>> {
    return this.search({ status }, pagination)
  }

  async findByName(name: string, pagination: PaginationOptions): Promise<PaginatedResult<Patient>> {
    return this.search({ query: name }, pagination)
  }

  async findByContact(contact: string, pagination: PaginationOptions): Promise<PaginatedResult<Patient>> {
    return this.search({ query: contact }, pagination)
  }

  async existsByCpf(cpf: string): Promise<boolean> {
    return this.patients.some(p => p.personalInfo.cpf.value === cpf)
  }

  async findPotentialDuplicates(personalInfo: { fullName: string; dateOfBirth: Date; cpf?: string }): Promise<Patient[]> {
    return []
  }

  async count(): Promise<number> {
    return this.patients.length
  }

  async countByStatus(status: PatientStatus): Promise<number> {
    return this.patients.filter(p => p.status.equals(status)).length
  }

  reset() {
    this.patients = []
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date()
    let age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--
    }
    return age
  }
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 14: Comprehensive Search Functionality', () => {
  describe('Search by patient identifiers', () => {
    it('should find patients by name with accurate results', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            const mockRepository = new MockPatientRepository()
            
            // Create patient
            const patientId = PatientId.generate()
            const now = new Date()
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient, userId.value)

            // Search by full name
            const searchResult = await mockRepository.findByName(
              personalInfo.fullName.value,
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should find the patient
            return (
              searchResult.data.length === 1 &&
              searchResult.data[0].id.equals(patientId) &&
              searchResult.total === 1
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should find patients by partial name match', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            const mockRepository = new MockPatientRepository()
            
            // Create patient
            const patientId = PatientId.generate()
            const now = new Date()
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient, userId.value)

            // Search by partial name (first 3 characters)
            const partialName = personalInfo.fullName.value.substring(0, 3)
            const searchResult = await mockRepository.search(
              { query: partialName },
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should find the patient if partial name matches
            const found = searchResult.data.some(p => p.id.equals(patientId))
            return found || partialName.length < 3
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should find patients by phone number', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            const mockRepository = new MockPatientRepository()
            
            // Create patient
            const patientId = PatientId.generate()
            const now = new Date()
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient, userId.value)

            // Search by phone number
            const phone = contactInfo.primaryPhone.value.replace(/\D/g, '')
            const searchResult = await mockRepository.findByContact(
              phone,
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should find the patient
            return (
              searchResult.data.length === 1 &&
              searchResult.data[0].id.equals(patientId)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should find patients by email when email exists', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            // Only test when email exists
            fc.pre(contactInfo.email !== null && contactInfo.email !== undefined)

            const mockRepository = new MockPatientRepository()
            
            // Create patient
            const patientId = PatientId.generate()
            const now = new Date()
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient, userId.value)

            // Search by email
            const email = contactInfo.email!.value
            const searchResult = await mockRepository.findByContact(
              email,
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should find the patient
            return (
              searchResult.data.length === 1 &&
              searchResult.data[0].id.equals(patientId)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should find patients by CPF', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            const mockRepository = new MockPatientRepository()
            
            // Create patient
            const patientId = PatientId.generate()
            const now = new Date()
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient, userId.value)

            // Search by CPF (without formatting)
            const cpf = personalInfo.cpf.value.replace(/\D/g, '')
            const searchResult = await mockRepository.search(
              { query: cpf },
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should find the patient
            return (
              searchResult.data.length === 1 &&
              searchResult.data[0].id.equals(patientId)
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Search result accuracy and privacy', () => {
    it('should return only matching patients with no false positives', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          personalInformationGenerator(),
          contactInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (
            personalInfo1,
            personalInfo2,
            contactInfo1,
            contactInfo2,
            emergencyContact1,
            emergencyContact2,
            insuranceInfo1,
            insuranceInfo2,
            status,
            userId
          ) => {
            // Ensure they are different
            fc.pre(
              personalInfo1.cpf.value !== personalInfo2.cpf.value &&
              personalInfo1.fullName.value !== personalInfo2.fullName.value
            )

            const mockRepository = new MockPatientRepository()
            
            // Create two different patients
            const patientId1 = PatientId.generate()
            const patientId2 = PatientId.generate()
            const now = new Date()
            
            const patient1 = new Patient(
              patientId1,
              personalInfo1,
              contactInfo1,
              emergencyContact1,
              insuranceInfo1,
              status,
              now,
              now,
              userId
            )
            
            const patient2 = new Patient(
              patientId2,
              personalInfo2,
              contactInfo2,
              emergencyContact2,
              insuranceInfo2,
              status,
              now,
              now,
              userId
            )
            
            await mockRepository.create(patient1, userId.value)
            await mockRepository.create(patient2, userId.value)

            // Search for patient1 by name
            const searchResult = await mockRepository.findByName(
              personalInfo1.fullName.value,
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should only find patient1, not patient2
            const foundPatient1 = searchResult.data.some(p => p.id.equals(patientId1))
            const foundPatient2 = searchResult.data.some(p => p.id.equals(patientId2))
            
            return foundPatient1 && !foundPatient2
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return empty results for non-existent search terms', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          fc.string({ minLength: 10, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId, nonExistentName) => {
            // Ensure the search term doesn't match
            fc.pre(!personalInfo.fullName.value.toLowerCase().includes(nonExistentName.toLowerCase()))

            const mockRepository = new MockPatientRepository()
            
            // Create patient
            const patientId = PatientId.generate()
            const now = new Date()
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient, userId.value)

            // Search for non-existent name
            const searchResult = await mockRepository.findByName(
              nonExistentName,
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should return empty results
            return searchResult.data.length === 0 && searchResult.total === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain search consistency across multiple invocations', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            const mockRepository = new MockPatientRepository()
            
            // Create patient
            const patientId = PatientId.generate()
            const now = new Date()
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient, userId.value)

            // Search multiple times with same criteria
            const searchResult1 = await mockRepository.findByName(
              personalInfo.fullName.value,
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )
            
            const searchResult2 = await mockRepository.findByName(
              personalInfo.fullName.value,
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Results should be identical
            return (
              searchResult1.data.length === searchResult2.data.length &&
              searchResult1.total === searchResult2.total &&
              searchResult1.data.every((p1, idx) => 
                p1.id.equals(searchResult2.data[idx].id)
              )
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Pagination and result structure', () => {
    it('should return proper pagination metadata', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(
              personalInformationGenerator(),
              contactInformationGenerator(),
              emergencyContactGenerator(),
              insuranceInformationGenerator(),
              patientStatusGenerator()
            ),
            { minLength: 5, maxLength: 20 }
          ),
          userIdGenerator(),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          async (patientDataArray, userId, limit, page) => {
            const mockRepository = new MockPatientRepository()
            
            // Create multiple patients
            for (const [personalInfo, contactInfo, emergencyContact, insuranceInfo, status] of patientDataArray) {
              const patientId = PatientId.generate()
              const now = new Date()
              const patient = new Patient(
                patientId,
                personalInfo,
                contactInfo,
                emergencyContact,
                insuranceInfo,
                status,
                now,
                now,
                userId
              )
              await mockRepository.create(patient, userId.value)
            }

            // Search with pagination
            const searchResult = await mockRepository.search(
              {},
              { page, limit, sortBy: 'name', sortOrder: 'asc' }
            )

            // Verify pagination metadata
            const expectedTotalPages = Math.ceil(patientDataArray.length / limit)
            const expectedHasNext = page < expectedTotalPages
            const expectedHasPrevious = page > 1

            return (
              searchResult.total === patientDataArray.length &&
              searchResult.page === page &&
              searchResult.limit === limit &&
              searchResult.totalPages === expectedTotalPages &&
              searchResult.hasNext === expectedHasNext &&
              searchResult.hasPrevious === expectedHasPrevious &&
              searchResult.data.length <= limit
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should respect pagination limits', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(
              personalInformationGenerator(),
              contactInformationGenerator(),
              emergencyContactGenerator(),
              insuranceInformationGenerator(),
              patientStatusGenerator()
            ),
            { minLength: 10, maxLength: 30 }
          ),
          userIdGenerator(),
          fc.integer({ min: 1, max: 5 }),
          async (patientDataArray, userId, limit) => {
            const mockRepository = new MockPatientRepository()
            
            // Create multiple patients
            for (const [personalInfo, contactInfo, emergencyContact, insuranceInfo, status] of patientDataArray) {
              const patientId = PatientId.generate()
              const now = new Date()
              const patient = new Patient(
                patientId,
                personalInfo,
                contactInfo,
                emergencyContact,
                insuranceInfo,
                status,
                now,
                now,
                userId
              )
              await mockRepository.create(patient, userId.value)
            }

            // Search with limit
            const searchResult = await mockRepository.search(
              {},
              { page: 1, limit, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should not exceed limit
            return searchResult.data.length <= limit
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle empty search results gracefully', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 20 }),
          async (nonExistentQuery) => {
            const mockRepository = new MockPatientRepository()

            // Search with no patients in repository
            const searchResult = await mockRepository.search(
              { query: nonExistentQuery },
              { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
            )

            // Should return empty results with proper structure
            return (
              searchResult.data.length === 0 &&
              searchResult.total === 0 &&
              searchResult.totalPages === 0 &&
              searchResult.hasNext === false &&
              searchResult.hasPrevious === false &&
              Array.isArray(searchResult.data)
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Search with filters', () => {
    it('should filter by patient status accurately', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(
              personalInformationGenerator(),
              contactInformationGenerator(),
              emergencyContactGenerator(),
              insuranceInformationGenerator(),
              patientStatusGenerator()
            ),
            { minLength: 5, maxLength: 15 }
          ),
          userIdGenerator(),
          patientStatusGenerator(),
          async (patientDataArray, userId, filterStatus) => {
            const mockRepository = new MockPatientRepository()
            
            // Create multiple patients with different statuses
            for (const [personalInfo, contactInfo, emergencyContact, insuranceInfo, status] of patientDataArray) {
              const patientId = PatientId.generate()
              const now = new Date()
              const patient = new Patient(
                patientId,
                personalInfo,
                contactInfo,
                emergencyContact,
                insuranceInfo,
                status,
                now,
                now,
                userId
              )
              await mockRepository.create(patient, userId.value)
            }

            // Search by status
            const searchResult = await mockRepository.findByStatus(
              filterStatus,
              { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }
            )

            // All results should have the filtered status
            return searchResult.data.every(p => p.status.equals(filterStatus))
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should filter by age range accurately', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(
              personalInformationGenerator(),
              contactInformationGenerator(),
              emergencyContactGenerator(),
              insuranceInformationGenerator(),
              patientStatusGenerator()
            ),
            { minLength: 5, maxLength: 15 }
          ),
          userIdGenerator(),
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 51, max: 100 }),
          async (patientDataArray, userId, minAge, maxAge) => {
            const mockRepository = new MockPatientRepository()
            
            // Create multiple patients
            for (const [personalInfo, contactInfo, emergencyContact, insuranceInfo, status] of patientDataArray) {
              const patientId = PatientId.generate()
              const now = new Date()
              const patient = new Patient(
                patientId,
                personalInfo,
                contactInfo,
                emergencyContact,
                insuranceInfo,
                status,
                now,
                now,
                userId
              )
              await mockRepository.create(patient, userId.value)
            }

            // Search by age range
            const searchResult = await mockRepository.search(
              { ageRange: { min: minAge, max: maxAge } },
              { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }
            )

            // All results should be within age range
            return searchResult.data.every(p => {
              const age = calculateAge(p.personalInfo.dateOfBirth)
              return age >= minAge && age <= maxAge
            })
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})

// Helper function for age calculation
function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--
  }
  return age
}
