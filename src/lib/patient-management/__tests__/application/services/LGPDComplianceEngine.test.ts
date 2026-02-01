// ============================================================================
// LGPD COMPLIANCE ENGINE TESTS
// Unit tests for the LGPD Compliance Engine service
// ============================================================================

import { 
  LGPDComplianceEngine, 
  ConsentRequest, 
  ConsentType, 
  LegalBasis,
  DataOperation,
  ExportFormat,
  IncidentType,
  IncidentSeverity,
  IncidentStatus
} from '../../../application/services/LGPDComplianceEngine'
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
  findById: jest.fn(),
  update: jest.fn(),
  search: jest.fn(),
  create: jest.fn(),
  delete: jest.fn()
}

const mockDocumentRepository = {
  findByPatientId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

const mockMedicalRecordRepository = {
  findByPatientId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

const mockEncryptionService = {
  encrypt: jest.fn(),
  decrypt: jest.fn()
}

const mockAuditLogger = {
  logDataAccess: jest.fn()
}

describe('LGPDComplianceEngine', () => {
  let lgpdEngine: LGPDComplianceEngine
  const mockPatientId = 'patient-123'
  const mockUserId = 'user-456'

  beforeEach(() => {
    jest.clearAllMocks()
    lgpdEngine = new LGPDComplianceEngine(
      mockPatientRepository as any,
      mockDocumentRepository as any,
      mockMedicalRecordRepository as any,
      mockEncryptionService as any,
      mockAuditLogger as any
    )
  })

  describe('recordConsent', () => {
    it('should successfully record patient consent', async () => {
      // Mock patient exists
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const consentRequest: ConsentRequest = {
        patientId: mockPatientId,
        consentType: 'data_processing' as ConsentType,
        granted: true,
        legalBasis: 'consent' as LegalBasis,
        userId: mockUserId
      }

      const result = await lgpdEngine.recordConsent(consentRequest)

      expect(result.patientId).toBe(mockPatientId)
      expect(result.consentType).toBe('data_processing')
      expect(result.granted).toBe(true)
      expect(result.legalBasis).toBe('consent')
      expect(result.recordedBy).toBe(mockUserId)
      expect(result.grantedAt).toBeInstanceOf(Date)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          patientId: mockPatientId,
          operation: 'create',
          dataType: 'consent',
          accessResult: 'granted'
        })
      )
    })

    it('should throw error when patient not found', async () => {
      mockPatientRepository.findById.mockResolvedValue(null)

      const consentRequest: ConsentRequest = {
        patientId: mockPatientId,
        consentType: 'data_processing' as ConsentType,
        granted: true,
        legalBasis: 'consent' as LegalBasis,
        userId: mockUserId
      }

      await expect(lgpdEngine.recordConsent(consentRequest))
        .rejects.toThrow('Patient not found')
    })

    it('should record consent withdrawal', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const consentRequest: ConsentRequest = {
        patientId: mockPatientId,
        consentType: 'marketing' as ConsentType,
        granted: false,
        legalBasis: 'consent' as LegalBasis,
        userId: mockUserId
      }

      const result = await lgpdEngine.recordConsent(consentRequest)

      expect(result.granted).toBe(false)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          justification: 'Consent withdrawn for marketing'
        })
      )
    })
  })

  describe('checkDataAccess', () => {
    it('should grant access for authorized user with valid consent', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const result = await lgpdEngine.checkDataAccess(
        mockUserId,
        mockPatientId,
        'read' as DataOperation
      )

      expect(result).toBe(true)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          accessResult: 'granted',
          justification: 'Access authorized'
        })
      )
    })

    it('should deny access when patient not found', async () => {
      mockPatientRepository.findById.mockResolvedValue(null)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const result = await lgpdEngine.checkDataAccess(
        mockUserId,
        mockPatientId,
        'read' as DataOperation
      )

      expect(result).toBe(false)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          accessResult: 'denied',
          justification: 'Patient not found'
        })
      )
    })

    it('should log access attempts regardless of result', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      await lgpdEngine.checkDataAccess(
        mockUserId,
        mockPatientId,
        'update' as DataOperation
      )

      expect(mockAuditLogger.logDataAccess).toHaveBeenCalled()
    })
  })

  describe('processDataPortabilityRequest', () => {
    it('should successfully process data portability request', async () => {
      const mockPatient = createMockPatient()
      const mockDocuments = [{ id: 'doc1', fileName: 'test.pdf' }]
      const mockMedicalRecords = [{ id: 'record1', diagnosis: [] }]

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue(mockDocuments)
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue(mockMedicalRecords)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const result = await lgpdEngine.processDataPortabilityRequest(
        mockPatientId,
        'json' as ExportFormat,
        mockUserId
      )

      expect(result.patientId).toBe(mockPatientId)
      expect(result.format).toBe('json')
      expect(result.status).toBe('completed')
      expect(result.downloadUrl).toBeDefined()
      expect(result.expiresAt).toBeInstanceOf(Date)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'export',
          dataType: 'patient_data',
          accessResult: 'granted'
        })
      )
    })

    it('should throw error when patient not found for portability request', async () => {
      mockPatientRepository.findById.mockResolvedValue(null)

      await expect(lgpdEngine.processDataPortabilityRequest(
        mockPatientId,
        'json' as ExportFormat,
        mockUserId
      )).rejects.toThrow('Patient not found')
    })

    it('should support different export formats', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const formats: ExportFormat[] = ['json', 'xml', 'csv', 'pdf']
      
      for (const format of formats) {
        const result = await lgpdEngine.processDataPortabilityRequest(
          mockPatientId,
          format,
          mockUserId
        )
        expect(result.format).toBe(format)
      }
    })
  })

  describe('processDataDeletionRequest', () => {
    it('should successfully process data deletion request', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const result = await lgpdEngine.processDataDeletionRequest(
        mockPatientId,
        'Patient requested data deletion',
        mockUserId
      )

      expect(result.patientId).toBe(mockPatientId)
      expect(result.reason).toBe('Patient requested data deletion')
      expect(result.status).toBe('completed')
      expect(result.auditTrailPreserved).toBe(true)
      expect(result.completedAt).toBeInstanceOf(Date)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
          dataType: 'patient_data',
          accessResult: 'granted'
        })
      )
    })

    it('should throw error when patient not found for deletion request', async () => {
      mockPatientRepository.findById.mockResolvedValue(null)

      await expect(lgpdEngine.processDataDeletionRequest(
        mockPatientId,
        'Test deletion',
        mockUserId
      )).rejects.toThrow('Patient not found')
    })

    it('should preserve audit trail during deletion', async () => {
      const mockPatient = createMockPatient()
      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const result = await lgpdEngine.processDataDeletionRequest(
        mockPatientId,
        'LGPD compliance deletion',
        mockUserId
      )

      expect(result.auditTrailPreserved).toBe(true)
    })
  })

  describe('encryptSensitiveData', () => {
    it('should encrypt data successfully', async () => {
      const testData = { name: 'João Silva', cpf: '11144477735' }
      const encryptedData = 'encrypted_data_string'
      
      mockEncryptionService.encrypt.mockResolvedValue(encryptedData)

      const result = await lgpdEngine.encryptSensitiveData(testData)

      expect(result).toBe(encryptedData)
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(JSON.stringify(testData))
    })

    it('should handle encryption errors', async () => {
      const testData = { name: 'Test' }
      mockEncryptionService.encrypt.mockRejectedValue(new Error('Encryption failed'))

      await expect(lgpdEngine.encryptSensitiveData(testData))
        .rejects.toThrow('Data encryption failed')
    })
  })

  describe('decryptSensitiveData', () => {
    it('should decrypt data successfully', async () => {
      const testData = { name: 'João Silva', cpf: '11144477735' }
      const encryptedData = 'encrypted_data_string'
      
      mockEncryptionService.decrypt.mockResolvedValue(JSON.stringify(testData))

      const result = await lgpdEngine.decryptSensitiveData(encryptedData)

      expect(result).toEqual(testData)
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(encryptedData)
    })

    it('should handle decryption errors', async () => {
      const encryptedData = 'invalid_encrypted_data'
      mockEncryptionService.decrypt.mockRejectedValue(new Error('Decryption failed'))

      await expect(lgpdEngine.decryptSensitiveData(encryptedData))
        .rejects.toThrow('Data decryption failed')
    })
  })

  describe('reportIncident', () => {
    it('should successfully report security incident', async () => {
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const incident = {
        type: 'data_breach' as IncidentType,
        severity: 'high' as IncidentSeverity,
        description: 'Unauthorized access detected',
        affectedPatients: [mockPatientId],
        detectedAt: new Date(),
        reportedBy: mockUserId,
        status: 'detected' as IncidentStatus,
        mitigationActions: ['Revoke access', 'Change passwords'],
        resolved: false
      }

      const result = await lgpdEngine.reportIncident(incident)

      expect(result.id).toBeDefined()
      expect(result.type).toBe('data_breach')
      expect(result.severity).toBe('high')
      expect(result.reportedAt).toBeInstanceOf(Date)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          dataType: 'incident_report',
          accessResult: 'granted'
        })
      )
    })

    it('should handle different incident types', async () => {
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const incidentTypes: IncidentType[] = [
        'data_breach',
        'unauthorized_access',
        'data_loss',
        'system_compromise',
        'human_error'
      ]

      for (const type of incidentTypes) {
        const incident = {
          type,
          severity: 'medium' as IncidentSeverity,
          description: `Test incident: ${type}`,
          affectedPatients: [mockPatientId],
          detectedAt: new Date(),
          reportedBy: mockUserId,
          status: 'detected' as IncidentStatus,
          mitigationActions: [],
          resolved: false
        }

        const result = await lgpdEngine.reportIncident(incident)
        expect(result.type).toBe(type)
      }
    })

    it('should handle different severity levels', async () => {
      mockAuditLogger.logDataAccess.mockResolvedValue(undefined)

      const severityLevels: IncidentSeverity[] = ['low', 'medium', 'high', 'critical']

      for (const severity of severityLevels) {
        const incident = {
          type: 'data_breach' as IncidentType,
          severity,
          description: `Test incident with ${severity} severity`,
          affectedPatients: [mockPatientId],
          detectedAt: new Date(),
          reportedBy: mockUserId,
          status: 'detected' as IncidentStatus,
          mitigationActions: [],
          resolved: false
        }

        const result = await lgpdEngine.reportIncident(incident)
        expect(result.severity).toBe(severity)
      }
    })
  })

  // Helper function to create mock patient
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
})