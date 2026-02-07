// ============================================================================
// LGPD COMPLIANCE WORKFLOW INTEGRATION TESTS
// Integration tests for complete LGPD compliance workflows
// ============================================================================

import { LGPDComplianceEngine, ConsentRequest, DataOperation } from '../../application/services/LGPDComplianceEngine'
import { DataPortabilityService } from '../../application/services/DataPortabilityService'
import { DataDeletionService } from '../../application/services/DataDeletionService'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'

// Mock repositories
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

describe('LGPD Compliance Workflow Integration Tests', () => {
  let lgpdEngine: LGPDComplianceEngine
  let dataPortabilityService: DataPortabilityService
  let dataDeletionService: DataDeletionService
  const mockUserId = new UserId(crypto.randomUUID())
  const mockPatientId = new PatientId(crypto.randomUUID())

  beforeEach(() => {
    jest.clearAllMocks()

    // Initialize services
    lgpdEngine = new LGPDComplianceEngine(
      mockPatientRepository as any,
      mockDocumentRepository as any,
      mockMedicalRecordRepository as any,
      mockEncryptionService,
      mockAuditLogger
    )

    dataPortabilityService = new DataPortabilityService(
      mockPatientRepository as any,
      mockDocumentRepository as any,
      mockMedicalRecordRepository as any
    )

    dataDeletionService = new DataDeletionService(
      mockPatientRepository as any,
      mockDocumentRepository as any,
      mockMedicalRecordRepository as any,
      mockAuditLogger
    )
  })

  describe('Complete LGPD Consent Management Workflow', () => {
    it('should record and manage patient consent throughout lifecycle', async () => {
      // Arrange: Patient exists
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: 'Ana Paula Santos' },
          cpf: { value: '123.456.789-00' }
        },
        status: 'new'
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)

      // Act: Step 1 - Record initial consent for data processing
      const dataProcessingConsent: ConsentRequest = {
        patientId: mockPatientId,
        consentType: 'data_processing',
        granted: true,
        legalBasis: 'consent',
        userId: mockUserId
      }

      const consent1 = await lgpdEngine.recordConsent(dataProcessingConsent)

      // Assert: Consent recorded
      expect(consent1).toBeDefined()
      expect(consent1.granted).toBe(true)
      expect(consent1.consentType).toBe('data_processing')
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          dataType: 'consent'
        })
      )

      // Act: Step 2 - Record consent for data sharing
      const dataSharingConsent: ConsentRequest = {
        patientId: mockPatientId,
        consentType: 'data_sharing',
        granted: true,
        legalBasis: 'consent',
        userId: mockUserId
      }

      const consent2 = await lgpdEngine.recordConsent(dataSharingConsent)

      // Assert: Second consent recorded
      expect(consent2).toBeDefined()
      expect(consent2.consentType).toBe('data_sharing')

      // Act: Step 3 - Verify data access is allowed
      const hasAccess = await lgpdEngine.checkDataAccess(
        mockUserId,
        mockPatientId,
        'read'
      )

      // Assert: Access granted
      expect(hasAccess).toBe(true)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'read',
          accessResult: 'granted'
        })
      )
    })

    it('should handle consent withdrawal and restrict access', async () => {
      // Arrange: Patient with existing consent
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: 'Roberto Lima' },
          cpf: { value: '987.654.321-00' }
        }
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)

      // Mock existing consent
      const existingConsent = {
        id: 'consent-123',
        patientId: mockPatientId,
        consentType: 'data_processing' as const,
        granted: true,
        grantedAt: new Date('2024-01-01'),
        legalBasis: 'consent' as const,
        recordedBy: mockUserId
      }

      // Mock the private method by setting up the engine's internal state
      jest.spyOn(lgpdEngine as any, 'findConsentRecord').mockResolvedValue(existingConsent)
      jest.spyOn(lgpdEngine as any, 'updateConsentRecord').mockResolvedValue(undefined)

      // Act: Withdraw consent
      const withdrawnConsent = await lgpdEngine.withdrawConsent(
        mockPatientId,
        'data_processing',
        mockUserId
      )

      // Assert: Consent withdrawn
      expect(withdrawnConsent).toBeDefined()
      expect(withdrawnConsent.granted).toBe(false)
      expect(withdrawnConsent.withdrawnAt).toBeDefined()
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
          justification: expect.stringContaining('withdrawn')
        })
      )
    })
  })

  describe('Complete Data Portability Workflow', () => {
    it('should export all patient data in requested format', async () => {
      // Arrange: Patient with complete data
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: 'Fernanda Costa' },
          dateOfBirth: new Date('1992-05-20'),
          cpf: { value: '111.222.333-44' },
          gender: { value: 'female' }
        },
        contactInfo: {
          primaryPhone: { value: '(11) 99999-8888' },
          email: { value: 'fernanda.costa@example.com' }
        },
        status: 'active'
      }

      const mockDocuments = [
        {
          id: 'doc-1',
          fileName: 'assessment-report.pdf',
          fileType: 'application/pdf',
          uploadedAt: new Date('2024-01-15')
        }
      ]

      const mockMedicalRecords = [
        {
          id: 'record-1',
          diagnosis: [
            {
              code: 'F80.1',
              description: 'Expressive language disorder'
            }
          ],
          createdAt: new Date('2024-01-15')
        }
      ]

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue(mockDocuments)
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue(mockMedicalRecords)

      // Mock storage of exported data
      jest.spyOn(lgpdEngine as any, 'storeExportedData').mockResolvedValue('https://secure-storage.example.com/exports/export-123')
      jest.spyOn(lgpdEngine as any, 'storePortabilityRequest').mockResolvedValue(undefined)

      // Act: Process data portability request
      const portabilityRequest = await lgpdEngine.processDataPortabilityRequest(
        mockPatientId,
        'json',
        mockUserId
      )

      // Assert: Data exported successfully
      expect(portabilityRequest).toBeDefined()
      expect(portabilityRequest.status).toBe('completed')
      expect(portabilityRequest.format).toBe('json')
      expect(portabilityRequest.downloadUrl).toBeDefined()
      expect(portabilityRequest.expiresAt).toBeDefined()
      expect(portabilityRequest.completedAt).toBeDefined()

      // Verify all data sources were accessed
      expect(mockPatientRepository.findById).toHaveBeenCalledWith(mockPatientId)
      expect(mockDocumentRepository.findByPatientId).toHaveBeenCalledWith(mockPatientId)
      expect(mockMedicalRecordRepository.findByPatientId).toHaveBeenCalledWith(mockPatientId)

      // Verify audit log
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'export',
          dataType: 'patient_data',
          accessResult: 'granted'
        })
      )
    })

    it('should support multiple export formats', async () => {
      // Arrange: Patient data
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: 'Carlos Mendes' }
        }
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      mockDocumentRepository.findByPatientId.mockResolvedValue([])
      mockMedicalRecordRepository.findByPatientId.mockResolvedValue([])

      jest.spyOn(lgpdEngine as any, 'storeExportedData').mockResolvedValue('https://secure-storage.example.com/exports/export-456')
      jest.spyOn(lgpdEngine as any, 'storePortabilityRequest').mockResolvedValue(undefined)

      // Act: Export in different formats
      const jsonExport = await lgpdEngine.processDataPortabilityRequest(mockPatientId, 'json', mockUserId)
      const xmlExport = await lgpdEngine.processDataPortabilityRequest(mockPatientId, 'xml', mockUserId)
      const csvExport = await lgpdEngine.processDataPortabilityRequest(mockPatientId, 'csv', mockUserId)
      const pdfExport = await lgpdEngine.processDataPortabilityRequest(mockPatientId, 'pdf', mockUserId)

      // Assert: All formats supported
      expect(jsonExport.format).toBe('json')
      expect(xmlExport.format).toBe('xml')
      expect(csvExport.format).toBe('csv')
      expect(pdfExport.format).toBe('pdf')
    })
  })

  describe('Complete Data Deletion Workflow', () => {
    it('should delete patient data while preserving audit trail', async () => {
      // Arrange: Patient to be deleted
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: 'Patricia Oliveira' },
          cpf: { value: '555.666.777-88' }
        }
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)

      // Mock deletion operations
      jest.spyOn(lgpdEngine as any, 'preserveAuditTrail').mockResolvedValue(undefined)
      jest.spyOn(lgpdEngine as any, 'deletePatientData').mockResolvedValue(undefined)
      jest.spyOn(lgpdEngine as any, 'storeDeletionRequest').mockResolvedValue(undefined)

      // Act: Process data deletion request
      const deletionRequest = await lgpdEngine.processDataDeletionRequest(
        mockPatientId,
        'Patient requested data deletion under LGPD Article 18',
        mockUserId
      )

      // Assert: Deletion completed
      expect(deletionRequest).toBeDefined()
      expect(deletionRequest.status).toBe('completed')
      expect(deletionRequest.auditTrailPreserved).toBe(true)
      expect(deletionRequest.completedAt).toBeDefined()
      expect(deletionRequest.reason).toContain('LGPD Article 18')

      // Verify audit trail was preserved before deletion
      expect((lgpdEngine as any).preserveAuditTrail).toHaveBeenCalledWith(mockPatientId)

      // Verify data was deleted
      expect((lgpdEngine as any).deletePatientData).toHaveBeenCalledWith(mockPatientId)

      // Verify audit log
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
          dataType: 'patient_data',
          accessResult: 'granted'
        })
      )
    })
  })

  describe('Complete Data Encryption Workflow', () => {
    it('should encrypt and decrypt sensitive patient data', async () => {
      // Arrange: Sensitive patient data
      const sensitiveData = {
        cpf: '123.456.789-00',
        medicalHistory: 'Patient has history of speech disorders',
        medications: ['Omega-3', 'Vitamin B12'],
        diagnosis: 'F80.1 - Expressive language disorder'
      }

      // Act: Encrypt data
      const encryptedData = await lgpdEngine.encryptSensitiveData(sensitiveData)

      // Assert: Data encrypted
      expect(encryptedData).toBeDefined()
      expect(encryptedData).toBe('encrypted-data')
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(JSON.stringify(sensitiveData))

      // Act: Decrypt data
      mockEncryptionService.decrypt.mockResolvedValue(JSON.stringify(sensitiveData))
      const decryptedData = await lgpdEngine.decryptSensitiveData(encryptedData)

      // Assert: Data decrypted correctly
      expect(decryptedData).toEqual(sensitiveData)
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(encryptedData)
    })
  })

  describe('Complete Security Incident Response Workflow', () => {
    it('should report and handle security incidents', async () => {
      // Arrange: Security incident
      const incident = {
        type: 'unauthorized_access' as const,
        severity: 'high' as const,
        description: 'Attempted unauthorized access to patient records detected',
        affectedPatients: [mockPatientId],
        detectedAt: new Date(),
        reportedBy: mockUserId,
        status: 'detected' as const,
        mitigationActions: [
          'Blocked suspicious IP address',
          'Notified security team',
          'Initiated investigation'
        ],
        resolved: false
      }

      // Mock incident storage and response
      jest.spyOn(lgpdEngine as any, 'storeIncidentReport').mockResolvedValue(undefined)
      jest.spyOn(lgpdEngine as any, 'triggerEmergencyResponse').mockResolvedValue(undefined)

      // Act: Report incident
      const incidentReport = await lgpdEngine.reportIncident(incident)

      // Assert: Incident reported
      expect(incidentReport).toBeDefined()
      expect(incidentReport.id).toBeDefined()
      expect(incidentReport.reportedAt).toBeDefined()
      expect(incidentReport.type).toBe('unauthorized_access')
      expect(incidentReport.severity).toBe('high')

      // Verify emergency response was triggered for high severity
      expect((lgpdEngine as any).triggerEmergencyResponse).toHaveBeenCalledWith(incidentReport)

      // Verify audit log
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          dataType: 'incident_report'
        })
      )
    })

    it('should not trigger emergency response for low severity incidents', async () => {
      // Arrange: Low severity incident
      const incident = {
        type: 'human_error' as const,
        severity: 'low' as const,
        description: 'User accidentally accessed wrong patient record',
        affectedPatients: [mockPatientId],
        detectedAt: new Date(),
        reportedBy: mockUserId,
        status: 'detected' as const,
        mitigationActions: ['User training scheduled'],
        resolved: false
      }

      jest.spyOn(lgpdEngine as any, 'storeIncidentReport').mockResolvedValue(undefined)
      jest.spyOn(lgpdEngine as any, 'triggerEmergencyResponse').mockResolvedValue(undefined)

      // Act: Report low severity incident
      const incidentReport = await lgpdEngine.reportIncident(incident)

      // Assert: Incident reported but no emergency response
      expect(incidentReport).toBeDefined()
      expect(incidentReport.severity).toBe('low')
      expect((lgpdEngine as any).triggerEmergencyResponse).not.toHaveBeenCalled()
    })
  })

  describe('Complete Access Control Workflow', () => {
    it('should enforce access control throughout patient data lifecycle', async () => {
      // Arrange: Patient and user
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: 'Juliana Ferreira' }
        }
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)

      // Mock permission checks
      jest.spyOn(lgpdEngine as any, 'checkUserPermission').mockResolvedValue(true)
      jest.spyOn(lgpdEngine as any, 'checkConsent').mockResolvedValue(true)

      // Act: Check access for different operations
      const readAccess = await lgpdEngine.checkDataAccess(mockUserId, mockPatientId, 'read')
      const updateAccess = await lgpdEngine.checkDataAccess(mockUserId, mockPatientId, 'update')
      const deleteAccess = await lgpdEngine.checkDataAccess(mockUserId, mockPatientId, 'delete')
      const exportAccess = await lgpdEngine.checkDataAccess(mockUserId, mockPatientId, 'export')

      // Assert: All operations checked and logged
      expect(readAccess).toBe(true)
      expect(updateAccess).toBe(true)
      expect(deleteAccess).toBe(true)
      expect(exportAccess).toBe(true)

      // Verify all access attempts were logged
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledTimes(4)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'read', accessResult: 'granted' })
      )
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'update', accessResult: 'granted' })
      )
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'delete', accessResult: 'granted' })
      )
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'export', accessResult: 'granted' })
      )
    })

    it('should deny access when patient does not exist', async () => {
      // Arrange: Non-existent patient
      mockPatientRepository.findById.mockResolvedValue(null)

      // Act: Attempt to access non-existent patient
      const hasAccess = await lgpdEngine.checkDataAccess(
        mockUserId,
        mockPatientId,
        'read'
      )

      // Assert: Access denied
      expect(hasAccess).toBe(false)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'read',
          accessResult: 'denied',
          justification: 'Patient not found'
        })
      )
    })

    it('should deny access when user lacks permissions', async () => {
      // Arrange: Patient exists but user lacks permission
      const mockPatient = {
        id: mockPatientId,
        personalInfo: {
          fullName: { value: 'Ricardo Santos' }
        }
      }

      mockPatientRepository.findById.mockResolvedValue(mockPatient)
      jest.spyOn(lgpdEngine as any, 'checkUserPermission').mockResolvedValue(false)

      // Act: Attempt unauthorized access
      const hasAccess = await lgpdEngine.checkDataAccess(
        mockUserId,
        mockPatientId,
        'read'
      )

      // Assert: Access denied
      expect(hasAccess).toBe(false)
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'read',
          accessResult: 'denied',
          justification: 'Insufficient permissions'
        })
      )
    })
  })
})
