// ============================================================================
// PATIENT REGISTRY SERVICE TESTS
// Unit tests for the PatientRegistry service layer
// ============================================================================

import { PatientRegistry, CreatePatientRequest, UpdatePatientRequest } from '../../../application/services/PatientRegistry'
import { IPatientRepository, CreatePatientData, UpdatePatientData } from '../../../infrastructure/repositories/IPatientRepository'
import { Patient } from '../../../domain/entities/Patient'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { PersonalInformation } from '../../../domain/value-objects/PersonalInformation'
import { ContactInformation } from '../../../domain/value-objects/ContactInformation'
import { EmergencyContact } from '../../../domain/value-objects/EmergencyContact'
import { InsuranceInformation } from '../../../domain/value-objects/InsuranceInformation'
import { PatientStatus } from '../../../domain/value-objects/PatientStatus'
import { FullName } from '../../../domain/value-objects/FullName'
import { Gender } from '../../../domain/value-objects/Gender'
import { CPF } from '../../../domain/value-objects/CPF'
import { RG } from '../../../domain/value-objects/RG'
import { PhoneNumber } from '../../../domain/value-objects/PhoneNumber'
import { Email } from '../../../domain/value-objects/Email'
import { Address } from '../../../domain/value-objects/Address'
import { UserId } from '../../../domain/value-objects/UserId'

// Mock repository implementation for testing
class MockPatientRepository implements IPatientRepository {
  private patients: Map<string, Patient> = new Map()
  private nextId = 1

  async create(patientData: CreatePatientData, createdBy: string): Promise<Patient> {
    const id = new PatientId(`550e8400-e29b-41d4-a716-44665544000${this.nextId++}`) // Valid UUID format
    const now = new Date()
    
    const patient = new Patient(
      id,
      new PersonalInformation(
        new FullName(patientData.personalInfo.fullName),
        patientData.personalInfo.dateOfBirth,
        new Gender(patientData.personalInfo.gender),
        new CPF(patientData.personalInfo.cpf),
        new RG(patientData.personalInfo.rg)
      ),
      new ContactInformation(
        new PhoneNumber(patientData.contactInfo.primaryPhone),
        patientData.contactInfo.secondaryPhone ? new PhoneNumber(patientData.contactInfo.secondaryPhone) : null,
        patientData.contactInfo.email ? new Email(patientData.contactInfo.email) : null,
        new Address(
          patientData.contactInfo.address.street,
          patientData.contactInfo.address.number,
          patientData.contactInfo.address.complement,
          patientData.contactInfo.address.neighborhood,
          patientData.contactInfo.address.city,
          patientData.contactInfo.address.state,
          patientData.contactInfo.address.zipCode
        )
      ),
      new EmergencyContact(
        new FullName(patientData.emergencyContact.name),
        new PhoneNumber(patientData.emergencyContact.phone),
        patientData.emergencyContact.relationship
      ),
      new InsuranceInformation(
        patientData.insuranceInfo.provider,
        patientData.insuranceInfo.policyNumber,
        patientData.insuranceInfo.groupNumber,
        patientData.insuranceInfo.validUntil
      ),
      new PatientStatus('new'),
      now,
      now,
      new UserId('550e8400-e29b-41d4-a716-446655440001') // Valid UUID
    )

    this.patients.set(id.value, patient)
    return patient
  }

  async findById(id: PatientId): Promise<Patient | null> {
    return this.patients.get(id.value) || null
  }

  async update(id: PatientId, updates: UpdatePatientData): Promise<Patient> {
    const existing = this.patients.get(id.value)
    if (!existing) {
      throw new Error('Patient not found')
    }

    // Create updated patient (simplified for testing)
    const updatedPatient = new Patient(
      existing.id,
      existing.personalInfo,
      existing.contactInfo,
      existing.emergencyContact,
      existing.insuranceInfo,
      existing.status,
      existing.createdAt,
      new Date(),
      existing.createdBy
    )

    this.patients.set(id.value, updatedPatient)
    return updatedPatient
  }

  async delete(id: PatientId): Promise<void> {
    this.patients.delete(id.value)
  }

  async search(): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrevious: false }
  }

  async findByStatus(): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrevious: false }
  }

  async findByName(): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrevious: false }
  }

  async findByContact(): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrevious: false }
  }

  async existsByCpf(cpf: string): Promise<boolean> {
    for (const patient of this.patients.values()) {
      if (patient.personalInfo.cpf.value === cpf) {
        return true
      }
    }
    return false
  }

  async findPotentialDuplicates(personalInfo: {
    fullName: string
    dateOfBirth: Date
    cpf?: string
  }): Promise<Patient[]> {
    const duplicates: Patient[] = []
    
    for (const patient of this.patients.values()) {
      // Check for exact CPF match (compare clean values)
      if (personalInfo.cpf) {
        const cleanSearchCpf = personalInfo.cpf.replace(/\D/g, '')
        const cleanPatientCpf = patient.personalInfo.cpf.value.replace(/\D/g, '')
        if (cleanPatientCpf === cleanSearchCpf) {
          duplicates.push(patient)
          continue
        }
      }

      // Check for name and date of birth match
      if (patient.personalInfo.fullName.value.toLowerCase() === personalInfo.fullName.toLowerCase() &&
          patient.personalInfo.dateOfBirth.getTime() === personalInfo.dateOfBirth.getTime()) {
        duplicates.push(patient)
      }
    }

    return duplicates
  }

  async count(): Promise<number> {
    return this.patients.size
  }

  async countByStatus(): Promise<number> {
    return 0
  }
}

describe('PatientRegistry', () => {
  let patientRegistry: PatientRegistry
  let mockRepository: MockPatientRepository

  beforeEach(() => {
    mockRepository = new MockPatientRepository()
    patientRegistry = new PatientRegistry(mockRepository)
  })

  const createValidPatientRequest = (): CreatePatientRequest => ({
    personalInfo: {
      fullName: 'João Silva Santos',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'male',
      cpf: '11144477735', // Valid CPF
      rg: '123456789'
    },
    contactInfo: {
      primaryPhone: '11987654321',
      secondaryPhone: '1133334444',
      email: 'joao.silva@email.com',
      address: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567',
        country: 'Brasil'
      }
    },
    emergencyContact: {
      name: 'Maria Silva Santos',
      relationship: 'spouse',
      phone: '11999887766',
      email: 'maria.silva@email.com'
    },
    insuranceInfo: {
      provider: 'Unimed',
      policyNumber: 'POL123456',
      groupNumber: 'GRP789',
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    }
  })

  describe('createPatient', () => {
    it('should create a patient with valid data', async () => {
      const request = createValidPatientRequest()
      const createdBy = 'user-123'

      const result = await patientRegistry.createPatient(request, createdBy)

      expect(result).toBeInstanceOf(Patient)
      expect(result.personalInfo.fullName.value).toBe('João Silva Santos')
      expect(result.personalInfo.cpf.value).toBe('111.444.777-35')
      expect(result.contactInfo.primaryPhone.value).toBe('(11) 98765-4321')
      expect(result.emergencyContact.name.value).toBe('Maria Silva Santos')
    })

    it('should throw validation error for missing full name', async () => {
      const request = createValidPatientRequest()
      request.personalInfo.fullName = ''

      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('Full name is required')
    })

    it('should throw validation error for invalid CPF', async () => {
      const request = createValidPatientRequest()
      request.personalInfo.cpf = 'invalid-cpf'

      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('Invalid CPF format')
    })

    it('should throw validation error for invalid email', async () => {
      const request: CreatePatientRequest = {
        personalInfo: {
          fullName: 'João Silva Santos',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '11144477735', // Valid CPF
          rg: '123456789'
        },
        contactInfo: {
          primaryPhone: '11987654321',
          email: 'invalid-email', // Invalid email
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234567'
          }
        },
        emergencyContact: {
          name: 'Maria Silva Santos',
          relationship: 'spouse',
          phone: '11999887766'
        }
      }

      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('Invalid email format')
    })

    it('should throw validation error for invalid phone number', async () => {
      const request: CreatePatientRequest = {
        personalInfo: {
          fullName: 'João Silva Santos',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '11144477735', // Valid CPF
          rg: '123456789'
        },
        contactInfo: {
          primaryPhone: 'invalid-phone', // Invalid phone
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234567'
          }
        },
        emergencyContact: {
          name: 'Maria Silva Santos',
          relationship: 'spouse',
          phone: '11999887766'
        }
      }

      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('Invalid phone number format')
    })

    it('should throw validation error for future date of birth', async () => {
      const request = createValidPatientRequest()
      request.personalInfo.dateOfBirth = new Date('2030-01-01')

      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('Date of birth cannot be in the future')
    })

    it('should throw validation error for missing required address fields', async () => {
      const request: CreatePatientRequest = {
        personalInfo: {
          fullName: 'João Silva Santos',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '11144477735', // Valid CPF
          rg: '123456789'
        },
        contactInfo: {
          primaryPhone: '11987654321',
          address: {
            street: '', // Empty street
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234567'
          }
        },
        emergencyContact: {
          name: 'Maria Silva Santos',
          relationship: 'spouse',
          phone: '11999887766'
        }
      }

      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('Street is required')
    })

    it('should throw validation error for missing emergency contact', async () => {
      const request: CreatePatientRequest = {
        personalInfo: {
          fullName: 'João Silva Santos',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '11144477735', // Valid CPF
          rg: '123456789'
        },
        contactInfo: {
          primaryPhone: '11987654321',
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234567'
          }
        },
        emergencyContact: {
          name: '', // Empty name
          relationship: 'spouse',
          phone: '11999887766'
        }
      }

      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('Emergency contact name is required')
    })

    it('should detect high confidence duplicates and throw error', async () => {
      const request = createValidPatientRequest()
      
      // Create first patient
      await patientRegistry.createPatient(request, 'user-123')

      // Try to create duplicate
      await expect(patientRegistry.createPatient(request, 'user-123'))
        .rejects.toThrow('A patient with similar information already exists')
    })
  })

  describe('updatePatient', () => {
    it('should update a patient with valid data', async () => {
      const createRequest = createValidPatientRequest()
      const patient = await patientRegistry.createPatient(createRequest, 'user-123')

      const updateRequest: UpdatePatientRequest = {
        personalInfo: {
          fullName: 'João Silva Santos Updated'
        }
      }

      const result = await patientRegistry.updatePatient(patient.id.value, updateRequest)

      expect(result).toBeInstanceOf(Patient)
      expect(result.id.value).toBe(patient.id.value)
    })

    it('should throw error when updating non-existent patient', async () => {
      const updateRequest: UpdatePatientRequest = {
        personalInfo: {
          fullName: 'Updated Name'
        }
      }

      await expect(patientRegistry.updatePatient('non-existent-id', updateRequest))
        .rejects.toThrow('Patient with ID non-existent-id not found')
    })

    it('should throw validation error for invalid update data', async () => {
      const createRequest = createValidPatientRequest()
      const patient = await patientRegistry.createPatient(createRequest, 'user-123')

      const updateRequest: UpdatePatientRequest = {
        personalInfo: {
          fullName: '' // Empty name
        }
      }

      await expect(patientRegistry.updatePatient(patient.id.value, updateRequest))
        .rejects.toThrow('Full name cannot be empty')
    })
  })

  describe('getPatient', () => {
    it('should retrieve an existing patient', async () => {
      const createRequest = createValidPatientRequest()
      const patient = await patientRegistry.createPatient(createRequest, 'user-123')

      const result = await patientRegistry.getPatient(patient.id.value)

      expect(result).toBeInstanceOf(Patient)
      expect(result?.id.value).toBe(patient.id.value)
    })

    it('should return null for non-existent patient', async () => {
      const result = await patientRegistry.getPatient('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('deletePatient', () => {
    it('should delete an existing patient', async () => {
      const createRequest = createValidPatientRequest()
      const patient = await patientRegistry.createPatient(createRequest, 'user-123')

      await patientRegistry.deletePatient(patient.id.value)

      const result = await patientRegistry.getPatient(patient.id.value)
      expect(result).toBeNull()
    })

    it('should throw error when deleting non-existent patient', async () => {
      await expect(patientRegistry.deletePatient('non-existent-id'))
        .rejects.toThrow('Patient with ID non-existent-id not found')
    })
  })

  describe('detectDuplicates', () => {
    it('should detect no duplicates for unique patient', async () => {
      const result = await patientRegistry.detectDuplicates({
        fullName: 'Unique Patient',
        dateOfBirth: new Date('1990-01-01'),
        cpf: '33344455567' // Valid CPF
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.potentialDuplicates).toHaveLength(0)
      expect(result.confidence).toBe('low')
    })

    it('should detect high confidence duplicate with same CPF', async () => {
      const createRequest = createValidPatientRequest()
      await patientRegistry.createPatient(createRequest, 'user-123')

      const result = await patientRegistry.detectDuplicates({
        fullName: 'Different Name',
        dateOfBirth: new Date('1985-01-01'),
        cpf: '11144477735' // Same CPF
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.potentialDuplicates).toHaveLength(1)
      expect(result.confidence).toBe('high')
      expect(result.matchingFields).toContain('cpf')
    })

    it('should detect high confidence duplicate with same name and date of birth', async () => {
      const createRequest = createValidPatientRequest()
      await patientRegistry.createPatient(createRequest, 'user-123')

      const result = await patientRegistry.detectDuplicates({
        fullName: 'João Silva Santos', // Same name
        dateOfBirth: new Date('1990-05-15'), // Same date of birth
        cpf: '33344455567' // Different CPF
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.potentialDuplicates).toHaveLength(1)
      expect(result.confidence).toBe('high')
      expect(result.matchingFields).toContain('fullName')
      expect(result.matchingFields).toContain('dateOfBirth')
    })
  })

  describe('mergePatients', () => {
    it('should merge two patients successfully', async () => {
      const createRequest1 = createValidPatientRequest()
      const patient1 = await patientRegistry.createPatient(createRequest1, 'user-123')

      const createRequest2 = createValidPatientRequest()
      createRequest2.personalInfo.cpf = '12345678909' // Valid CPF
      createRequest2.personalInfo.fullName = 'João Silva Santos Duplicate'
      createRequest2.insuranceInfo!.validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      const patient2 = await patientRegistry.createPatient(createRequest2, 'user-123')

      const mergeRequest = {
        primaryPatientId: patient1.id.value,
        duplicatePatientId: patient2.id.value,
        mergeStrategy: {
          personalInfo: 'primary' as const,
          contactInfo: 'primary' as const,
          emergencyContact: 'primary' as const,
          insuranceInfo: 'primary' as const
        }
      }

      const result = await patientRegistry.mergePatients(mergeRequest)

      expect(result).toBeInstanceOf(Patient)
      expect(result.id.value).toBe(patient1.id.value)

      // Verify duplicate patient was deleted
      const deletedPatient = await patientRegistry.getPatient(patient2.id.value)
      expect(deletedPatient).toBeNull()
    })

    it('should throw error when primary patient not found', async () => {
      const createRequest = createValidPatientRequest()
      const patient = await patientRegistry.createPatient(createRequest, 'user-123')

      const mergeRequest = {
        primaryPatientId: 'non-existent-id',
        duplicatePatientId: patient.id.value,
        mergeStrategy: {
          personalInfo: 'primary' as const,
          contactInfo: 'primary' as const,
          emergencyContact: 'primary' as const,
          insuranceInfo: 'primary' as const
        }
      }

      await expect(patientRegistry.mergePatients(mergeRequest))
        .rejects.toThrow('Primary patient with ID non-existent-id not found')
    })

    it('should throw error when duplicate patient not found', async () => {
      const createRequest = createValidPatientRequest()
      const patient = await patientRegistry.createPatient(createRequest, 'user-123')

      const mergeRequest = {
        primaryPatientId: patient.id.value,
        duplicatePatientId: 'non-existent-id',
        mergeStrategy: {
          personalInfo: 'primary' as const,
          contactInfo: 'primary' as const,
          emergencyContact: 'primary' as const,
          insuranceInfo: 'primary' as const
        }
      }

      await expect(patientRegistry.mergePatients(mergeRequest))
        .rejects.toThrow('Duplicate patient with ID non-existent-id not found')
    })
  })

  describe('searchPatients', () => {
    it('should delegate search to repository', async () => {
      const criteria = { query: 'João' }
      const pagination = { page: 1, limit: 10 }

      const result = await patientRegistry.searchPatients(criteria, pagination)

      expect(result).toBeDefined()
      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})