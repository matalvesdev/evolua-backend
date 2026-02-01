// ============================================================================
// DUPLICATE DETECTION PROPERTY TESTS
// Property-based tests for intelligent duplicate detection
// Feature: patient-management-system, Property 13: Intelligent Duplicate Detection
// **Validates: Requirements 1.6, 6.3**
// ============================================================================

import * as fc from 'fast-check'
import { PatientRegistry } from '../../application/services/PatientRegistry'
import { IPatientRepository } from '../../infrastructure/repositories/IPatientRepository'
import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import {
  fullNameGenerator,
  cpfGenerator,
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  patientStatusGenerator,
  userIdGenerator
} from '../../testing/generators'

// Mock repository for testing
class MockPatientRepository implements IPatientRepository {
  private patients: Patient[] = []

  async create(patientData: any, createdBy: string): Promise<Patient> {
    // Simply store the patient data as-is since it's already a Patient entity
    if (patientData instanceof Patient) {
      this.patients.push(patientData)
      return patientData
    }
    
    // If it's raw data, this shouldn't happen in our tests
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

  async search(criteria: any, pagination: any): Promise<any> {
    return {
      data: this.patients,
      total: this.patients.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false
    }
  }

  async findByStatus(status: any, pagination: any): Promise<any> {
    return this.search({}, pagination)
  }

  async findByName(name: string, pagination: any): Promise<any> {
    return this.search({}, pagination)
  }

  async findByContact(contact: string, pagination: any): Promise<any> {
    return this.search({}, pagination)
  }

  async existsByCpf(cpf: string): Promise<boolean> {
    return this.patients.some(p => p.personalInfo.cpf.value === cpf)
  }

  async findPotentialDuplicates(personalInfo: {
    fullName: string
    dateOfBirth: Date
    cpf?: string
  }): Promise<Patient[]> {
    const cleanSearchCpf = personalInfo.cpf?.replace(/\D/g, '')
    
    return this.patients.filter(patient => {
      // Exact CPF match
      if (cleanSearchCpf) {
        const cleanPatientCpf = patient.personalInfo.cpf.value.replace(/\D/g, '')
        if (cleanPatientCpf === cleanSearchCpf) {
          return true
        }
      }

      // Exact name and date of birth match
      if (patient.personalInfo.fullName.value.toLowerCase() === personalInfo.fullName.toLowerCase() &&
          patient.personalInfo.dateOfBirth.getTime() === personalInfo.dateOfBirth.getTime()) {
        return true
      }

      return false
    })
  }

  async count(): Promise<number> {
    return this.patients.length
  }

  async countByStatus(status: any): Promise<number> {
    return this.patients.filter(p => p.status.equals(status)).length
  }

  reset() {
    this.patients = []
  }
}

describe('Duplicate Detection Properties', () => {
  describe('Property 13: Intelligent Duplicate Detection', () => {
    it('should detect exact CPF duplicates with high confidence', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            // Create fresh repository for each iteration
            const mockRepository = new MockPatientRepository()
            const patientRegistry = new PatientRegistry(mockRepository)
            
            // Create first patient
            const patientId1 = PatientId.generate()
            const now = new Date()
            const patient1 = new Patient(
              patientId1,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient1, userId.value)

            // Check for duplicates with same CPF
            const duplicateCheck = await patientRegistry.detectDuplicates({
              fullName: personalInfo.fullName.value,
              dateOfBirth: personalInfo.dateOfBirth,
              cpf: personalInfo.cpf.value
            })

            // Should detect duplicate with high confidence
            return (
              duplicateCheck.isDuplicate === true &&
              duplicateCheck.confidence === 'high' &&
              duplicateCheck.potentialDuplicates.length > 0 &&
              duplicateCheck.matchingFields.includes('cpf')
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect exact name and date of birth duplicates with high confidence', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          cpfGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, differentCpf, userId) => {
            // Create fresh repository for each iteration
            const mockRepository = new MockPatientRepository()
            const patientRegistry = new PatientRegistry(mockRepository)
            
            // Create first patient
            const patientId1 = PatientId.generate()
            const now = new Date()
            const patient1 = new Patient(
              patientId1,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient1, userId.value)

            // Check for duplicates with same name and DOB but different CPF
            const duplicateCheck = await patientRegistry.detectDuplicates({
              fullName: personalInfo.fullName.value,
              dateOfBirth: personalInfo.dateOfBirth,
              cpf: differentCpf.value
            })

            // Should detect duplicate with high confidence
            return (
              duplicateCheck.isDuplicate === true &&
              duplicateCheck.confidence === 'high' &&
              duplicateCheck.potentialDuplicates.length > 0 &&
              (duplicateCheck.matchingFields.includes('fullName') || 
               duplicateCheck.matchingFields.includes('dateOfBirth'))
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not detect duplicates for completely different patients', () => {
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

            // Create fresh repository for each iteration
            const mockRepository = new MockPatientRepository()
            const patientRegistry = new PatientRegistry(mockRepository)
            
            // Create first patient
            const patientId1 = PatientId.generate()
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
            await mockRepository.create(patient1, userId.value)

            // Check for duplicates with completely different data
            const duplicateCheck = await patientRegistry.detectDuplicates({
              fullName: personalInfo2.fullName.value,
              dateOfBirth: personalInfo2.dateOfBirth,
              cpf: personalInfo2.cpf.value
            })

            // Should not detect duplicate
            return duplicateCheck.isDuplicate === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return matching fields for detected duplicates', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            // Create fresh repository for each iteration
            const mockRepository = new MockPatientRepository()
            const patientRegistry = new PatientRegistry(mockRepository)
            
            // Create first patient
            const patientId1 = PatientId.generate()
            const now = new Date()
            const patient1 = new Patient(
              patientId1,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            await mockRepository.create(patient1, userId.value)

            // Check for duplicates
            const duplicateCheck = await patientRegistry.detectDuplicates({
              fullName: personalInfo.fullName.value,
              dateOfBirth: personalInfo.dateOfBirth,
              cpf: personalInfo.cpf.value
            })

            // Should have matching fields when duplicate is detected
            return (
              !duplicateCheck.isDuplicate ||
              (duplicateCheck.matchingFields.length > 0 &&
               Array.isArray(duplicateCheck.matchingFields))
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all potential duplicates when multiple matches exist', () => {
      fc.assert(
        fc.asyncProperty(
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
            personalInfo,
            contactInfo1,
            contactInfo2,
            emergencyContact1,
            emergencyContact2,
            insuranceInfo1,
            insuranceInfo2,
            status,
            userId
          ) => {
            // Create fresh repository for each iteration
            const mockRepository = new MockPatientRepository()
            const patientRegistry = new PatientRegistry(mockRepository)
            
            // Create two patients with same personal info but different contact info
            const patientId1 = PatientId.generate()
            const patientId2 = PatientId.generate()
            const now = new Date()
            
            const patient1 = new Patient(
              patientId1,
              personalInfo,
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
              personalInfo,
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

            // Check for duplicates
            const duplicateCheck = await patientRegistry.detectDuplicates({
              fullName: personalInfo.fullName.value,
              dateOfBirth: personalInfo.dateOfBirth,
              cpf: personalInfo.cpf.value
            })

            // Should detect both duplicates
            return (
              duplicateCheck.isDuplicate === true &&
              duplicateCheck.potentialDuplicates.length >= 2
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should maintain duplicate detection consistency across multiple checks', () => {
      fc.assert(
        fc.asyncProperty(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          async (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            // Create fresh repository for each iteration
            const mockRepository = new MockPatientRepository()
            const patientRegistry = new PatientRegistry(mockRepository)
            
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

            // Check for duplicates multiple times
            const check1 = await patientRegistry.detectDuplicates({
              fullName: personalInfo.fullName.value,
              dateOfBirth: personalInfo.dateOfBirth,
              cpf: personalInfo.cpf.value
            })

            const check2 = await patientRegistry.detectDuplicates({
              fullName: personalInfo.fullName.value,
              dateOfBirth: personalInfo.dateOfBirth,
              cpf: personalInfo.cpf.value
            })

            // Results should be consistent
            return (
              check1.isDuplicate === check2.isDuplicate &&
              check1.confidence === check2.confidence &&
              check1.potentialDuplicates.length === check2.potentialDuplicates.length
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
