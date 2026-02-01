// ============================================================================
// DATA PORTABILITY SERVICE TESTS
// Unit tests for the Data Portability Service
// ============================================================================

import { 
  DataPortabilityService, 
  DataExportRequest, 
  ExportFormat 
} from '../../../application/services/DataPortabilityService'
import { Patient } from '../../../domain/entities/Patient'
import { PersonalInformation } from '../../../domain/value-objects/PersonalInformation'
import { ContactInformation } from '../../../domain/value-objects/ContactInformation'
import { PatientStatus, PatientStatusValues } from '../../../domain/value-objects/PatientStatus'
import { FullName } from '../../../domain/value-objects/FullName'
import { CPF } from '../../../domain/value-objects/CPF'
import { PhoneNumber } from '../../../domain/value-objects/PhoneNumber'
import { Address } from '../../../domain/value-objects/Address'
import { Gender } from '../../../domain/value-objects/Gender'
import { RG } from '../../../domain/value-objects/RG'

// Mock repositories and services
const mockPatientRepository = {
  findById: jest.fn()
}

const mockDocumentRepository = {
  findByPatientId: jest.fn()
}

const mockMedicalRecordRepository = {
  findByPatientId: jest.fn()
}

const mockAuditRepository = {
  findByPatientId: jest.fn()
}

const mockConsentRepository = {
  findByPatientId: jest.fn()
}

const mockStatusHistoryRepository = {
  findByPatientId: jest.fn()
}

const mockEncryptionService = {
  encrypt: jest.fn()
}

describe('DataPortabilityService', () => {
  let dataPortabilityService: DataPortabilityService
  const mockPatientId = 'patient-123'
  const mockUserId = 'user-456'

  beforeEach(() => {
    jest.clearAllMocks()
    dataPortabilityService = new DataPortabilityService(
      mockPatientRepository as any,
      mockDocumentRepository as any,
      mockMedicalRecordRepository as any,
      mockAuditRepository as any,
      mockConsentRepository as any,
      mockStatusHistoryRepository as any,
      mockEncryptionService as any
    )
  })

  describe('validateExportRequest', () => {
    it('should validate a basic export request successfully', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        reason: 'Patient data portability request'
      }

      const result = await dataPortabilityService.validateExportRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.estimatedSize).toBeGreaterThanOrEqual(0)
      expect(result.estimatedProcessingTime).toBeGreaterThanOrEqual(0)
    })

    it('should return error when patient not found', async () => {
      mockPatientRepository.findById.mockResolvedValue(null)

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        reason: 'Test request'
      }

      const result = await dataPortabilityService.validateExportRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Patient not found')
    })

    it('should validate date range correctly', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        dateRange: {
          from: new Date('2024-12-01'),
          to: new Date('2024-01-01') // Invalid: from > to
        },
        reason: 'Test request'
      }

      const result = await dataPortabilityService.validateExportRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid date range: from date must be before to date')
    })

    it('should warn about large date ranges', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        dateRange: {
          from: new Date('2010-01-01'),
          to: new Date('2024-01-01') // 14 years
        },
        reason: 'Test request'
      }

      const result = await dataPortabilityService.validateExportRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('Large date range'))).toBe(true)
    })

    it('should estimate size correctly for documents', async () => {
      const mockPatient = createMockPatient()
      const mockDocuments = [
        { id: 'doc1', fileSize: 1024 * 1024 }, // 1MB
        { id: 'doc2', fileSize: 2 * 1024 * 1024 } // 2MB
      ]

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue(mockDocuments)
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: true,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        reason: 'Test request'
      }

      const result = await dataPortabilityService.validateExportRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.estimatedSize).toBe(3 * 1024 * 1024) // 3MB total
    })

    it('should warn about audit trail inclusion', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: true,
        reason: 'Test request'
      }

      const result = await dataPortabilityService.validateExportRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('audit trail'))).toBe(true)
    })
  })

  describe('exportPatientData', () => {
    it('should export basic patient data successfully', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])
      mockStatusHistoryRepository.findByPatientId.mockResolvedValue([])
      mockConsentRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        reason: 'Patient data portability request'
      }

      const result = await dataPortabilityService.exportPatientData(request)

      expect(result.exportId).toBeDefined()
      expect(result.patientId).toBe(mockPatientId)
      expect(result.format).toBe('json')
      expect(result.data.personalInformation).toBeDefined()
      expect(result.data.contactInformation).toBeDefined()
      expect(result.metadata.exportedBy).toBe(mockUserId)
      expect(result.metadata.legalBasis).toContain('LGPD Article 18')
    })

    it('should include medical history when requested', async () => {
      const mockPatient = createMockPatient()
      const mockMedicalRecords = [
        { id: 'record1', diagnosis: ['Test diagnosis'], createdAt: new Date() }
      ]

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue(mockMedicalRecords)
      mockStatusHistoryRepository.findByPatientId.mockResolvedValue([])
      mockConsentRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: true,
        includeAuditTrail: false,
        reason: 'Medical history export'
      }

      const result = await dataPortabilityService.exportPatientData(request)

      expect(result.data.medicalHistory).toHaveLength(1)
      expect(result.metadata.dataTypes).toContain('medical_history')
      expect(result.metadata.totalRecords).toBeGreaterThan(0)
    })

    it('should include documents when requested', async () => {
      const mockPatient = createMockPatient()
      const mockDocuments = [
        { 
          id: 'doc1', 
          fileName: 'test.pdf', 
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: new Date(),
          metadata: { documentType: 'medical_report' }
        }
      ]

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue(mockDocuments)
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])
      mockStatusHistoryRepository.findByPatientId.mockResolvedValue([])
      mockConsentRepository.findByPatientId.mockResolvedValue([])

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: true,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        reason: 'Document export'
      }

      const result = await dataPortabilityService.exportPatientData(request)

      expect(result.data.documents).toHaveLength(1)
      expect(result.data.documents[0].fileName).toBe('test.pdf')
      expect(result.metadata.dataTypes).toContain('documents')
    })

    it('should include audit trail when requested', async () => {
      const mockPatient = createMockPatient()
      const mockAuditLogs = [
        {
          operation: 'read',
          dataType: 'patient_data',
          timestamp: new Date(),
          userId: mockUserId,
          accessResult: 'granted'
        }
      ]

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])
      mockStatusHistoryRepository.findByPatientId.mockResolvedValue([])
      mockConsentRepository.findByPatientId.mockResolvedValue([])
      mockAuditRepository.findByPatientId.mockResolvedValue(mockAuditLogs)

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: true,
        reason: 'Audit trail export'
      }

      const result = await dataPortabilityService.exportPatientData(request)

      expect(result.data.auditTrail).toHaveLength(1)
      expect(result.metadata.dataTypes).toContain('audit_trail')
    })

    it('should throw error when patient not found', async () => {
      mockPatientRepository.findById.mockResolvedValue(null)

      const request: DataExportRequest = {
        patientId: mockPatientId,
        requestedBy: mockUserId,
        format: 'json' as ExportFormat,
        includeDocuments: false,
        includeMedicalHistory: false,
        includeAuditTrail: false,
        reason: 'Test request'
      }

      await expect(dataPortabilityService.exportPatientData(request))
        .rejects.toThrow('Export validation failed')
    })
  })

  describe('formatExportData', () => {
    it('should format data as JSON', async () => {
      const mockExportData = createMockExportData()

      const result = await dataPortabilityService.formatExportData(mockExportData, 'json')

      expect(typeof result).toBe('string')
      expect(() => JSON.parse(result)).not.toThrow()
      
      const parsed = JSON.parse(result)
      expect(parsed.exportId).toBe(mockExportData.exportId)
    })

    it('should format data as XML', async () => {
      const mockExportData = createMockExportData()

      const result = await dataPortabilityService.formatExportData(mockExportData, 'xml')

      expect(typeof result).toBe('string')
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(result).toContain('<patientDataExport>')
      expect(result).toContain('</patientDataExport>')
    })

    it('should format data as CSV', async () => {
      const mockExportData = createMockExportData()

      const result = await dataPortabilityService.formatExportData(mockExportData, 'csv')

      expect(typeof result).toBe('string')
      expect(result).toContain('Export Metadata')
      expect(result).toContain('Personal Information')
      expect(result).toContain('Contact Information')
    })

    it('should handle PDF format', async () => {
      const mockExportData = createMockExportData()

      const result = await dataPortabilityService.formatExportData(mockExportData, 'pdf')

      expect(typeof result).toBe('string')
      // PDF generation is placeholder in current implementation
      expect(result).toContain('PDF generation requires additional PDF library')
    })

    it('should throw error for unsupported format', async () => {
      const mockExportData = createMockExportData()

      await expect(dataPortabilityService.formatExportData(mockExportData, 'unsupported' as ExportFormat))
        .rejects.toThrow('Unsupported export format')
    })
  })

  describe('generateSecureDownloadLink', () => {
    it('should generate secure download link', async () => {
      const mockExportData = createMockExportData()
      mockEncryptionService.encrypt.mockResolvedValue('encrypted_data')

      const result = await dataPortabilityService.generateSecureDownloadLink(mockExportData, 72)

      expect(typeof result).toBe('string')
      expect(result).toContain('/api/exports/download/')
      expect(mockEncryptionService.encrypt).toHaveBeenCalled()
    })

    it('should use default expiration time', async () => {
      const mockExportData = createMockExportData()
      mockEncryptionService.encrypt.mockResolvedValue('encrypted_data')

      const result = await dataPortabilityService.generateSecureDownloadLink(mockExportData)

      expect(typeof result).toBe('string')
      expect(result).toContain('/api/exports/download/')
    })

    it('should handle encryption errors', async () => {
      const mockExportData = createMockExportData()
      mockEncryptionService.encrypt.mockRejectedValue(new Error('Encryption failed'))

      await expect(dataPortabilityService.generateSecureDownloadLink(mockExportData))
        .rejects.toThrow('Download link generation failed')
    })
  })

  // Helper functions
  function createMockPatient(): Patient {
    const personalInfo = new PersonalInformation(
      new FullName('João Silva'),
      new Date('1990-01-01'),
      Gender.MALE,
      new CPF('11144477735'),
      new RG('123456789')
    )

    const contactInfo = new ContactInformation(
      new PhoneNumber('11987654321'),
      undefined,
      undefined,
      new Address('Rua A', '123', null, 'Centro', 'São Paulo', 'SP', '01000000')
    )

    return new Patient(
      mockPatientId,
      personalInfo,
      contactInfo,
      undefined,
      undefined,
      new PatientStatus(PatientStatusValues.ACTIVE),
      new Date(),
      new Date(),
      mockUserId
    )
  }

  function createMockExportData() {
    return {
      exportId: 'export_123',
      patientId: mockPatientId,
      exportedAt: new Date(),
      format: 'json' as ExportFormat,
      data: {
        personalInformation: {
          fullName: 'João Silva',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          cpf: '11144477735'
        },
        contactInformation: {
          primaryPhone: '11987654321',
          address: {
            street: 'Rua A',
            number: '123',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        medicalHistory: [],
        documents: [],
        statusHistory: [],
        consentHistory: [],
        auditTrail: []
      },
      metadata: {
        totalRecords: 1,
        dataTypes: ['personal_information', 'contact_information'],
        exportedBy: mockUserId,
        retentionPeriod: '7 years',
        legalBasis: 'LGPD Article 18'
      }
    }
  }
})