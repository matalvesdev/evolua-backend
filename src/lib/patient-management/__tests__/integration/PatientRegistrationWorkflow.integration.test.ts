// ============================================================================
// PATIENT REGISTRATION WORKFLOW INTEGRATION TESTS
// Integration tests for complete patient registration workflow
// ============================================================================

import { PatientRegistry, CreatePatientRequest } from '../../application/services/PatientRegistry'
import { StatusTracker } from '../../application/services/StatusTracker'
import { LGPDComplianceEngine } from '../../application/services/LGPDComplianceEngine'
import { PatientId } from '../../domain/value-objects/PatientId'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { UserId } from '../../domain/value-objects/UserId'

// Mock repositories and services
const mockPatientRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  findByStatus: jest.fn(),
  findByName: jest.fn(),
  findByContact: jest.fn(),
  existsByCpf: jest.fn(),
  findPotentialDuplicates: jest.fn(),
  count: jest.fn(),
  countByStatus: jest.fn()
}

const mockStatusRepository = {
  create: jest.fn(),
  updateStatus: jest.fn(),
  getStatusHistory: jest.fn(),
  findByStatus: jest.fn()
}

const mockDocumentRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByPatientId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

const mockMedicalRecordRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByPatientId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addProgressNote: jest.fn(),
  addAssessment: jest.fn(),
  getTimelineView: jest.fn()
}

const mockEncryptionService = {
  encrypt: jest.fn().mockResolvedValue('encrypted-data'),
  decrypt: jest.fn().mockResolvedValue('decrypted-data')
}

const mockAuditLogger = {
  logDataAccess: jest.fn().mockResolvedValue(undefined)
}

describe('Patient Registration Workflow Integration Tests', () => {
  let patientRegistry: PatientRegistry
  let statusTracker: StatusTracker
  let lgpdEngine: LGPDComplianceEngine
  const mockUserId = crypto.randomUUID()

  beforeEach(() => {
    jest.clearAllMocks()

    // Initialize services
    patientRegistry = new PatientRegistry(mockPatientRepository as any)
    statusTracker = new StatusTracker(mockPatientRepository as any, mockStatusRepository as any)
    lgpdEngine = new LGPDComplianceEngine(
      mockPatientRepository as any,
      mockDocumentRepository as any,
      mockMedicalRecordRepository as any,
      mockEncryptionService,
      mockAuditLogger
    )
  })

  describe('Complete Patient Registration Workflow', () => {
    it('should successfully register a new patient with all required steps', async () => {
      // Arrange: Prepare patient data
      const patientRequest: CreatePatientRequest = {
        personalInfo: {
          fullName: 'João Silva Santos',
          dateOfBirth: new Date('1985-03-15'),
          gender: 'male',
          cpf: '111.444.777-35', // Valid CPF format
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          secondaryPhone: '(11) 3456-7890',
          email: 'joao.silva@example.com',
          address: {
            street: 'Rua das Flores',
            number: '123',
            complement: 'Apto 45',
            neighborhood: 'Jardim Paulista',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva Santos',
          relationship: 'spouse',
          phone: '(11) 98888-7777',
          email: 'maria.silva@example.com'
        },
        insuranceInfo: {
          provider: 'Unimed',
          policyNumber: 'POL-123456',
          groupNumber: 'GRP-789',
          validUntil: new Date('2025-12-31')
        }
      }

      // Mock: No duplicates found
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      // Mock: Patient creation
      const mockPatientId = new PatientId(crypto.randomUUID())
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: patientRequest.personalInfo.fullName },
          dateOfBirth: patientRequest.personalInfo.dateOfBirth,
          gender: { value: patientRequest.personalInfo.gender },
          cpf: { value: patientRequest.personalInfo.cpf },
          rg: { value: patientRequest.personalInfo.rg }
        },
        contactInfo: {
          primaryPhone: { value: patientRequest.contactInfo.primaryPhone },
          secondaryPhone: patientRequest.contactInfo.secondaryPhone ? { value: patientRequest.contactInfo.secondaryPhone } : null,
          email: patientRequest.contactInfo.email ? { value: patientRequest.contactInfo.email } : null,
          address: {
            street: patientRequest.contactInfo.address.street,
            number: patientRequest.contactInfo.address.number,
            city: patientRequest.contactInfo.address.city,
            state: patientRequest.contactInfo.address.state,
            zipCode: patientRequest.contactInfo.address.zipCode
          }
        },
        emergencyContact: {
          name: { value: patientRequest.emergencyContact.name },
          phone: { value: patientRequest.emergencyContact.phone },
          relationship: patientRequest.emergencyContact.relationship
        },
        status: PatientStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new UserId(mockUserId)
      }
      mockPatientRepository.create.mockResolvedValue(mockPatient)

      // Act: Step 1 - Register patient
      const createdPatient = await patientRegistry.createPatient(patientRequest, mockUserId)

      // Assert: Patient created successfully
      expect(createdPatient).toBeDefined()
      expect(createdPatient.id).toBeDefined()
      expect(createdPatient.status).toBe(PatientStatus.NEW)
      expect(mockPatientRepository.create).toHaveBeenCalledTimes(1)
      expect(mockPatientRepository.findPotentialDuplicates).toHaveBeenCalledWith({
        fullName: patientRequest.personalInfo.fullName,
        dateOfBirth: patientRequest.personalInfo.dateOfBirth,
        cpf: patientRequest.personalInfo.cpf
      })

      // Act: Step 2 - Record LGPD consent
      const consentRequest = {
        patientId: mockPatientId,
        consentType: 'data_processing' as const,
        granted: true,
        legalBasis: 'consent' as const,
        userId: new UserId(mockUserId)
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      const consentRecord = await lgpdEngine.recordConsent(consentRequest)

      // Assert: Consent recorded
      expect(consentRecord).toBeDefined()
      expect(consentRecord.granted).toBe(true)
      expect(consentRecord.consentType).toBe('data_processing')
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalled()

      // Act: Step 3 - Verify initial status
      expect(createdPatient.status).toBe(PatientStatus.NEW)

      // Act: Step 4 - Verify audit trail
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Object),
          patientId: mockPatientId,
          operation: 'create',
          dataType: 'consent'
        })
      )
    })

    it('should detect and prevent duplicate patient registration', async () => {
      // Arrange: Prepare patient data
      const patientRequest: CreatePatientRequest = {
        personalInfo: {
          fullName: 'Maria Oliveira Costa',
          dateOfBirth: new Date('1990-07-20'),
          gender: 'female',
          cpf: '987.654.321-00',
          rg: '98.765.432-1'
        },
        contactInfo: {
          primaryPhone: '(21) 99876-5432',
          email: 'maria.oliveira@example.com',
          address: {
            street: 'Avenida Atlântica',
            number: '456',
            neighborhood: 'Copacabana',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '22021-000',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Pedro Costa',
          relationship: 'brother',
          phone: '(21) 98765-4321'
        }
      }

      // Mock: Duplicate patient found
      const existingPatientId = new PatientId(crypto.randomUUID())
      const existingPatient = {
        id: existingPatientId,
        personalInfo: {
          fullName: { value: 'Maria Oliveira Costa' },
          dateOfBirth: new Date('1990-07-20'),
          cpf: { value: '987.654.321-00' },
          rg: { value: '98.765.432-1' },
          gender: { value: 'female' }
        },
        contactInfo: {
          primaryPhone: { value: '(21) 99876-5432' },
          secondaryPhone: null,
          email: { value: 'maria.oliveira@example.com' },
          address: {
            street: 'Avenida Atlântica',
            number: '456',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '22021-000'
          }
        },
        emergencyContact: {
          name: { value: 'Pedro Costa' },
          phone: { value: '(21) 98765-4321' },
          relationship: 'brother'
        },
        status: PatientStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: new UserId(crypto.randomUUID())
      }

      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([existingPatient])

      // Act & Assert: Attempt to register duplicate patient
      await expect(
        patientRegistry.createPatient(patientRequest, mockUserId)
      ).rejects.toThrow('A patient with similar information already exists')

      // Verify duplicate detection was called
      expect(mockPatientRepository.findPotentialDuplicates).toHaveBeenCalledWith({
        fullName: patientRequest.personalInfo.fullName,
        dateOfBirth: patientRequest.personalInfo.dateOfBirth,
        cpf: patientRequest.personalInfo.cpf
      })

      // Verify patient was not created
      expect(mockPatientRepository.create).not.toHaveBeenCalled()
    })

    it('should validate required fields during registration', async () => {
      // Arrange: Invalid patient data (missing required fields)
      const invalidRequest: CreatePatientRequest = {
        personalInfo: {
          fullName: '', // Empty name
          dateOfBirth: new Date('2030-01-01'), // Future date
          gender: 'male',
          cpf: 'invalid-cpf', // Invalid CPF format
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: 'invalid-phone', // Invalid phone format
          address: {
            street: '', // Empty street
            number: '123',
            neighborhood: 'Centro',
            city: '', // Empty city
            state: '', // Empty state
            zipCode: '', // Empty zip code
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: '', // Empty name
          relationship: 'spouse',
          phone: 'invalid-phone' // Invalid phone format
        }
      }

      // Act & Assert: Attempt to register with invalid data
      await expect(
        patientRegistry.createPatient(invalidRequest, mockUserId)
      ).rejects.toThrow()

      // Verify patient was not created
      expect(mockPatientRepository.create).not.toHaveBeenCalled()
    })

    it('should handle patient status transition after registration', async () => {
      // Arrange: Create a patient first
      const patientId = new PatientId(crypto.randomUUID())
      const mockPatient = {
        id: patientId,
        personalInfo: {
          fullName: { value: 'Carlos Mendes' },
          dateOfBirth: new Date('1988-11-10'),
          cpf: { value: '111.222.333-44' },
          rg: { value: '11.222.333-4' },
          gender: { value: 'male' }
        },
        contactInfo: {
          primaryPhone: { value: '(31) 99999-8888' },
          secondaryPhone: null,
          email: null,
          address: {
            street: 'Rua Principal',
            number: '789',
            city: 'Belo Horizonte',
            state: 'MG',
            zipCode: '30000-000'
          }
        },
        emergencyContact: {
          name: { value: 'Ana Mendes' },
          phone: { value: '(31) 98888-7777' },
          relationship: 'sister'
        },
        status: PatientStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new UserId(mockUserId),
        changeStatus: jest.fn()
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockPatientRepository.update.mockResolvedValue({
        ...mockPatient,
        status: PatientStatus.ACTIVE
      })
      mockStatusRepository.create.mockResolvedValue({
        id: 'transition-123',
        patientId,
        fromStatus: PatientStatus.NEW,
        toStatus: PatientStatus.ACTIVE,
        reason: 'Patient completed initial assessment',
        timestamp: new Date(),
        changedBy: new UserId(mockUserId)
      })

      // Act: Transition from NEW to ACTIVE
      const transition = await statusTracker.changePatientStatus({
        patientId,
        newStatus: PatientStatus.ACTIVE,
        userId: new UserId(mockUserId),
        reason: 'Patient completed initial assessment'
      })

      // Assert: Status transition completed
      expect(transition).toBeDefined()
      expect(transition.fromStatus).toBe(PatientStatus.NEW)
      expect(transition.toStatus).toBe(PatientStatus.ACTIVE)
      expect(mockPatientRepository.update).toHaveBeenCalled()
      expect(mockStatusRepository.create).toHaveBeenCalled()
    })
  })
})
