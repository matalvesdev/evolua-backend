// ============================================================================
// DATA VALIDATION SERVICE TESTS
// Unit tests for comprehensive data validation
// Requirements: 6.1, 6.2, 6.4, 6.5, 6.6
// ============================================================================

import { DataValidationService } from '../../../application/services/DataValidationService'
import { IPatientRepository } from '../../../infrastructure/repositories/IPatientRepository'
import { IMedicalRecordRepository } from '../../../infrastructure/repositories/IMedicalRecordRepository'
import { IDocumentRepository } from '../../../infrastructure/repositories/IDocumentRepository'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { MedicalRecordId } from '../../../domain/value-objects/MedicalRecordId'
import { DocumentId } from '../../../domain/entities/Document'

// Mock repositories
const mockPatientRepository: jest.Mocked<IPatientRepository> = {
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

const mockMedicalRecordRepository: jest.Mocked<IMedicalRecordRepository> = {
  create: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findByPatientId: jest.fn(),
  addProgressNote: jest.fn(),
  addAssessment: jest.fn(),
  getTimelineView: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn()
}

const mockDocumentRepository: jest.Mocked<IDocumentRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByPatientId: jest.fn(),
  search: jest.fn(),
  findByType: jest.fn(),
  findByStatus: jest.fn(),
  findExpiredDocuments: jest.fn(),
  validateDocument: jest.fn(),
  storeFile: jest.fn(),
  retrieveFile: jest.fn(),
  encryptFile: jest.fn(),
  performVirusScan: jest.fn(),
  count: jest.fn(),
  countByPatient: jest.fn(),
  countByStatus: jest.fn(),
  getTotalStorageSize: jest.fn(),
  getPatientStorageSize: jest.fn(),
  createDocumentVersion: jest.fn(),
  getDocumentVersions: jest.fn(),
  retrieveDocumentVersion: jest.fn()
}

describe('DataValidationService', () => {
  let service: DataValidationService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new DataValidationService(
      mockPatientRepository,
      mockMedicalRecordRepository,
      mockDocumentRepository
    )
  })

  describe('validatePatientData', () => {
    it('should validate complete valid patient data', async () => {
      mockPatientRepository.existsByCpf.mockResolvedValue(false)
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      const validPatientData = {
        personalInfo: {
          fullName: 'João Silva Santos',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '123.456.789-09',
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
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva',
          relationship: 'spouse',
          phone: '(11) 91234-5678',
          email: 'maria.silva@example.com'
        },
        insuranceInfo: {
          provider: 'Unimed',
          policyNumber: 'POL123456',
          groupNumber: 'GRP789',
          validUntil: new Date('2025-12-31')
        }
      }

      const result = await service.validatePatientData(validPatientData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid CPF format', async () => {
      const invalidData = {
        personalInfo: {
          fullName: 'João Silva',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '111.111.111-11', // Invalid CPF (all same digits)
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva',
          relationship: 'spouse',
          phone: '(11) 91234-5678'
        }
      }

      const result = await service.validatePatientData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_CPF')).toBe(true)
    })

    it('should detect invalid email format', async () => {
      mockPatientRepository.existsByCpf.mockResolvedValue(false)

      const invalidData = {
        personalInfo: {
          fullName: 'João Silva',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '123.456.789-09',
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          email: 'invalid-email', // Invalid email
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva',
          relationship: 'spouse',
          phone: '(11) 91234-5678'
        }
      }

      const result = await service.validatePatientData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_EMAIL')).toBe(true)
    })

    it('should detect missing required fields', async () => {
      const invalidData = {
        personalInfo: {
          fullName: '', // Empty name
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '123.456.789-09',
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          address: {
            street: '', // Empty street
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva',
          relationship: 'spouse',
          phone: '(11) 91234-5678'
        }
      }

      const result = await service.validatePatientData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should warn about duplicate CPF', async () => {
      mockPatientRepository.existsByCpf.mockResolvedValue(true)
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      const data = {
        personalInfo: {
          fullName: 'João Silva',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '123.456.789-09',
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva',
          relationship: 'spouse',
          phone: '(11) 91234-5678'
        }
      }

      const result = await service.validatePatientData(data)

      expect(result.warnings.some(w => w.code === 'CPF_WARNING')).toBe(true)
    })
  })

  describe('checkReferentialIntegrity', () => {
    it('should pass when all references are valid', async () => {
      const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440000')
      const mockPatient = {
        id: patientId,
        personalInfo: {} as any,
        contactInfo: {} as any,
        emergencyContact: {} as any,
        insuranceInfo: {} as any,
        status: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {} as any
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])
      mockDocumentRepository.findByPatientId.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
      })

      const result = await service.checkReferentialIntegrity(patientId)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should detect missing patient reference', async () => {
      const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440001')

      mockPatientRepository.findById.mockResolvedValue(null)

      const result = await service.checkReferentialIntegrity(patientId)

      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].violationType).toBe('missing_reference')
    })

    it('should detect mismatched patient references in medical records', async () => {
      const patientId = new PatientId('550e8400-e29b-41d4-a716-446655440000')
      const wrongPatientId = new PatientId('550e8400-e29b-41d4-a716-446655440002')
      
      const mockPatient = {
        id: patientId,
        personalInfo: {} as any,
        contactInfo: {} as any,
        emergencyContact: {} as any,
        insuranceInfo: {} as any,
        status: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {} as any
      }

      const mockMedicalRecord = {
        id: new MedicalRecordId('550e8400-e29b-41d4-a716-446655440010'),
        patientId: wrongPatientId, // Mismatched reference
        diagnosis: [],
        treatmentHistory: [],
        medications: [],
        allergies: [],
        progressNotes: [],
        assessments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([mockMedicalRecord as any])
      mockDocumentRepository.findByPatientId.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
      })

      const result = await service.checkReferentialIntegrity(patientId)

      expect(result.isValid).toBe(false)
      expect(result.violations.some(v => v.entityType === 'MedicalRecord')).toBe(true)
    })
  })

  describe('validateBulkPatientData', () => {
    it('should validate multiple patient records', async () => {
      mockPatientRepository.existsByCpf.mockResolvedValue(false)
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      const bulkData = [
        {
          personalInfo: {
            fullName: 'João Silva',
            dateOfBirth: new Date('1990-05-15'),
            gender: 'male',
            cpf: '123.456.789-09',
            rg: '12.345.678-9'
          },
          contactInfo: {
            primaryPhone: '(11) 98765-4321',
            address: {
              street: 'Rua das Flores',
              number: '123',
              neighborhood: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01234-567',
              country: 'Brasil'
            }
          },
          emergencyContact: {
            name: 'Maria Silva',
            relationship: 'spouse',
            phone: '(11) 91234-5678'
          }
        },
        {
          personalInfo: {
            fullName: 'Ana Costa',
            dateOfBirth: new Date('1985-08-20'),
            gender: 'female',
            cpf: '987.654.321-00',
            rg: '98.765.432-1'
          },
          contactInfo: {
            primaryPhone: '(21) 98765-4321',
            address: {
              street: 'Avenida Brasil',
              number: '456',
              neighborhood: 'Copacabana',
              city: 'Rio de Janeiro',
              state: 'RJ',
              zipCode: '22070-011',
              country: 'Brasil'
            }
          },
          emergencyContact: {
            name: 'Pedro Costa',
            relationship: 'spouse',
            phone: '(21) 91234-5678'
          }
        }
      ]

      const result = await service.validateBulkPatientData(bulkData)

      expect(result.totalRecords).toBe(2)
      expect(result.validRecords).toBe(2)
      expect(result.invalidRecords).toBe(0)
    })

    it('should identify invalid records in bulk validation', async () => {
      mockPatientRepository.existsByCpf.mockResolvedValue(false)
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      const bulkData = [
        {
          personalInfo: {
            fullName: 'João Silva',
            dateOfBirth: new Date('1990-05-15'),
            gender: 'male',
            cpf: '123.456.789-09',
            rg: '12.345.678-9'
          },
          contactInfo: {
            primaryPhone: '(11) 98765-4321',
            address: {
              street: 'Rua das Flores',
              number: '123',
              neighborhood: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01234-567',
              country: 'Brasil'
            }
          },
          emergencyContact: {
            name: 'Maria Silva',
            relationship: 'spouse',
            phone: '(11) 91234-5678'
          }
        },
        {
          personalInfo: {
            fullName: '', // Invalid: empty name
            dateOfBirth: new Date('1985-08-20'),
            gender: 'female',
            cpf: '111.111.111-11', // Invalid: all same digits
            rg: '98.765.432-1'
          },
          contactInfo: {
            primaryPhone: '(21) 98765-4321',
            address: {
              street: 'Avenida Brasil',
              number: '456',
              neighborhood: 'Copacabana',
              city: 'Rio de Janeiro',
              state: 'RJ',
              zipCode: '22070-011',
              country: 'Brasil'
            }
          },
          emergencyContact: {
            name: 'Pedro Costa',
            relationship: 'spouse',
            phone: '(21) 91234-5678'
          }
        }
      ]

      const result = await service.validateBulkPatientData(bulkData)

      expect(result.totalRecords).toBe(2)
      expect(result.validRecords).toBe(1)
      expect(result.invalidRecords).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].recordIndex).toBe(1)
    })
  })

  describe('validateBusinessRules', () => {
    it('should warn when emergency contact is same as patient', async () => {
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      const data = {
        personalInfo: {
          fullName: 'João Silva',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '123.456.789-09',
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'João Silva', // Same as patient
          relationship: 'self',
          phone: '(11) 91234-5678'
        }
      }

      const result = await service.validateBusinessRules(data)

      expect(result.warnings.some(w => w.code === 'SAME_EMERGENCY_CONTACT')).toBe(true)
    })

    it('should warn when emergency phone is same as patient phone', async () => {
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      const data = {
        personalInfo: {
          fullName: 'João Silva',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '123.456.789-09',
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva',
          relationship: 'spouse',
          phone: '(11) 98765-4321' // Same as patient phone
        }
      }

      const result = await service.validateBusinessRules(data)

      expect(result.warnings.some(w => w.code === 'SAME_EMERGENCY_PHONE')).toBe(true)
    })

    it('should warn about expired insurance', async () => {
      mockPatientRepository.findPotentialDuplicates.mockResolvedValue([])

      const data = {
        personalInfo: {
          fullName: 'João Silva',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          cpf: '123.456.789-09',
          rg: '12.345.678-9'
        },
        contactInfo: {
          primaryPhone: '(11) 98765-4321',
          address: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        emergencyContact: {
          name: 'Maria Silva',
          relationship: 'spouse',
          phone: '(11) 91234-5678'
        },
        insuranceInfo: {
          provider: 'Unimed',
          policyNumber: 'POL123',
          validUntil: new Date('2020-01-01') // Expired
        }
      }

      const result = await service.validateBusinessRules(data)

      expect(result.warnings.some(w => w.code === 'EXPIRED_INSURANCE')).toBe(true)
    })
  })

  describe('getValidationSummary', () => {
    it('should generate readable validation summary', () => {
      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'personalInfo.cpf',
            message: 'Invalid CPF format',
            code: 'INVALID_CPF',
            severity: 'error' as const,
            suggestedFix: 'Provide a valid Brazilian CPF number'
          }
        ],
        warnings: [
          {
            field: 'emergencyContact.phone',
            message: 'Emergency contact phone is the same as patient primary phone',
            code: 'SAME_EMERGENCY_PHONE'
          }
        ],
        fieldResults: []
      }

      const summary = service.getValidationSummary(validationResult)

      expect(summary).toContain('Validation Result: FAILED')
      expect(summary).toContain('Total Errors: 1')
      expect(summary).toContain('Total Warnings: 1')
      expect(summary).toContain('Invalid CPF format')
      expect(summary).toContain('Suggested Fix:')
    })
  })
})
