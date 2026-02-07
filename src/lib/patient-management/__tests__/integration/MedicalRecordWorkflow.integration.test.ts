// ============================================================================
// MEDICAL RECORD MANAGEMENT WORKFLOW INTEGRATION TESTS
// Integration tests for complete medical record management workflow
// ============================================================================

import { MedicalRecordManager, MedicalRecordData, ProgressNoteData, AssessmentData } from '../../application/services/MedicalRecordManager'
import { DocumentManager, UploadDocumentRequest } from '../../application/services/DocumentManager'
import { PatientId } from '../../domain/value-objects/PatientId'
import { MedicalRecordId } from '../../domain/value-objects/MedicalRecordId'
import { UserId } from '../../domain/value-objects/UserId'
import { DocumentType } from '../../domain/entities/Document'

// Mock repositories
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

const mockDocumentRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByPatientId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  storeFile: jest.fn(),
  uploadFile: jest.fn(),
  retrieveFile: jest.fn(),
  validateDocument: jest.fn(),
  createDocumentVersion: jest.fn(),
  getDocumentVersions: jest.fn(),
  retrieveDocumentVersion: jest.fn(),
  performVirusScan: jest.fn(),
  encryptFile: jest.fn()
}

describe('Medical Record Management Workflow Integration Tests', () => {
  let medicalRecordManager: MedicalRecordManager
  let documentManager: DocumentManager
  const mockUserId = crypto.randomUUID()
  const mockPatientId = new PatientId(crypto.randomUUID())

  beforeEach(() => {
    jest.clearAllMocks()

    // Initialize services
    medicalRecordManager = new MedicalRecordManager(mockMedicalRecordRepository as any)
    documentManager = new DocumentManager(mockDocumentRepository as any)
  })

  describe('Complete Medical Record Management Workflow', () => {
    it('should create medical record with diagnosis, medications, and allergies', async () => {
      // Arrange: Prepare medical record data
      const medicalRecordData: MedicalRecordData = {
        diagnosis: [
          {
            code: 'F80.1',
            description: 'Expressive language disorder',
            diagnosedAt: new Date('2024-01-15'),
            severity: 'moderate'
          },
          {
            code: 'F80.2',
            description: 'Receptive language disorder',
            diagnosedAt: new Date('2024-01-15'),
            severity: 'mild'
          }
        ],
        medications: [
          {
            name: 'Omega-3',
            dosage: '1000mg',
            frequency: 'Once daily',
            startDate: new Date('2024-01-20'),
            prescribedBy: 'Dr. Silva',
            notes: 'To support cognitive function'
          }
        ],
        allergies: [
          {
            allergen: 'Penicillin',
            reaction: 'Skin rash',
            severity: 'moderate',
            diagnosedAt: new Date('2020-05-10'),
            notes: 'Avoid all penicillin-based antibiotics'
          }
        ],
        initialAssessment: {
          type: 'Speech and Language Assessment',
          findings: 'Patient shows difficulty with expressive language. Receptive language is mildly affected.',
          recommendations: [
            'Weekly speech therapy sessions',
            'Home practice exercises',
            'Follow-up assessment in 3 months'
          ],
          assessedBy: mockUserId,
          date: new Date('2024-01-15'),
          results: {
            expressiveLanguageScore: 65,
            receptiveLanguageScore: 78,
            articulationScore: 82
          }
        }
      }

      // Mock: Medical record creation
      const mockRecordId = new MedicalRecordId(crypto.randomUUID())
      const mockMedicalRecord = {
        id: mockRecordId,
        patientId: mockPatientId,
        diagnosis: medicalRecordData.diagnosis!.map(d => ({
          code: d.code,
          description: d.description,
          diagnosedAt: d.diagnosedAt,
          severity: d.severity
        })),
        medications: medicalRecordData.medications!.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          startDate: m.startDate,
          endDate: m.endDate,
          prescribedBy: m.prescribedBy,
          isActive: () => true
        })),
        allergies: medicalRecordData.allergies!.map(a => ({
          allergen: a.allergen,
          reaction: a.reaction,
          severity: a.severity,
          diagnosedAt: a.diagnosedAt
        })),
        treatmentHistory: [],
        progressNotes: [],
        assessments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockMedicalRecordRepository.create.mockResolvedValue(mockMedicalRecord)

      // Act: Create medical record
      const createdRecord = await medicalRecordManager.createMedicalRecord(
        mockPatientId,
        medicalRecordData,
        new UserId(mockUserId)
      )

      // Assert: Medical record created successfully
      expect(createdRecord).toBeDefined()
      expect(createdRecord.id).toBeDefined()
      expect(createdRecord.patientId).toBe(mockPatientId)
      expect(createdRecord.diagnosis).toHaveLength(2)
      expect(createdRecord.medications).toHaveLength(1)
      expect(createdRecord.allergies).toHaveLength(1)
      expect(mockMedicalRecordRepository.create).toHaveBeenCalledTimes(1)
    })

    it('should add progress notes to medical record chronologically', async () => {
      // Arrange: Existing medical record
      const mockRecordId = new MedicalRecordId(crypto.randomUUID())
      const mockMedicalRecord = {
        id: mockRecordId,
        patientId: mockPatientId,
        diagnosis: [],
        medications: [],
        allergies: [],
        treatmentHistory: [],
        progressNotes: [],
        assessments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockMedicalRecordRepository.findById.mockResolvedValue(mockMedicalRecord)
      mockMedicalRecordRepository.addProgressNote.mockResolvedValue(undefined)

      // Act: Add multiple progress notes
      const progressNote1: ProgressNoteData = {
        content: 'Patient showed improvement in articulation exercises. Able to produce /r/ sound with 70% accuracy.',
        sessionDate: new Date('2024-02-01'),
        category: 'treatment',
        createdBy: mockUserId
      }

      const progressNote2: ProgressNoteData = {
        content: 'Continued progress with expressive language. Patient can now form 4-5 word sentences consistently.',
        sessionDate: new Date('2024-02-08'),
        category: 'goal_progress',
        createdBy: mockUserId
      }

      const progressNote3: ProgressNoteData = {
        content: 'Assessment shows significant improvement. Expressive language score increased to 75.',
        sessionDate: new Date('2024-02-15'),
        category: 'assessment',
        createdBy: mockUserId
      }

      await medicalRecordManager.addProgressNote(mockRecordId, progressNote1)
      await medicalRecordManager.addProgressNote(mockRecordId, progressNote2)
      await medicalRecordManager.addProgressNote(mockRecordId, progressNote3)

      // Assert: Progress notes added in chronological order
      expect(mockMedicalRecordRepository.addProgressNote).toHaveBeenCalledTimes(3)
      
      // Verify each call
      const calls = mockMedicalRecordRepository.addProgressNote.mock.calls
      expect(calls[0][1].content).toContain('articulation exercises')
      expect(calls[1][1].content).toContain('expressive language')
      expect(calls[2][1].content).toContain('Assessment shows')
    })

    it('should upload and manage medical documents', async () => {
      // Arrange: Prepare document upload
      const mockFile = new File(['test content'], 'medical-report.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId.value,
        file: mockFile,
        metadata: {
          title: 'Initial Speech Assessment Report',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: true
        }
      }

      // Mock: Document upload
      const mockDocumentId = crypto.randomUUID()
      const mockDocument = {
        id: mockDocumentId,
        patientId: mockPatientId.value,
        fileName: 'medical-report.pdf',
        filePath: `${mockPatientId.value}/${mockDocumentId}/v1_${Date.now()}.pdf`,
        fileType: 'application/pdf',
        fileSize: mockFile.size,
        metadata: uploadRequest.metadata,
        uploadedAt: new Date(),
        uploadedBy: mockUserId,
        securityInfo: {
          isEncrypted: true,
          virusScanResult: 'clean',
          checksum: 'test-checksum-123'
        }
      }

      mockDocumentRepository.create.mockResolvedValue(mockDocument)
      mockDocumentRepository.storeFile.mockResolvedValue({
        filePath: `${mockPatientId.value}/${mockDocumentId}/v1_${Date.now()}.pdf`,
        checksum: 'test-checksum-123'
      })
      mockDocumentRepository.uploadFile.mockResolvedValue(undefined)
      mockDocumentRepository.validateDocument.mockResolvedValue({ isValid: true, errors: [] })
      mockDocumentRepository.performVirusScan.mockResolvedValue({ isClean: true, threats: [] })
      mockDocumentRepository.encryptFile.mockResolvedValue(undefined)

      // Act: Upload document
      const uploadedDocument = await documentManager.uploadDocument(uploadRequest, new UserId(mockUserId))

      // Assert: Document uploaded successfully
      expect(uploadedDocument).toBeDefined()
      expect(uploadedDocument.id).toBeDefined()
      expect(uploadedDocument.fileName).toBe('medical-report.pdf')
      expect(uploadedDocument.metadata.title).toBe('Initial Speech Assessment Report')
      expect(uploadedDocument.metadata.isConfidential).toBe(true)
      expect(mockDocumentRepository.storeFile).toHaveBeenCalled()
      expect(mockDocumentRepository.create).toHaveBeenCalled()
    })

    it('should generate treatment timeline with all events', async () => {
      // Arrange: Multiple medical records with events
      const mockRecords = [
        {
          id: new MedicalRecordId(crypto.randomUUID()),
          patientId: mockPatientId,
          diagnosis: [
            {
              code: 'F80.1',
              description: 'Expressive language disorder',
              diagnosedAt: new Date('2024-01-15'),
              severity: 'moderate'
            }
          ],
          medications: [],
          allergies: [],
          treatmentHistory: [
            {
              description: 'Speech therapy - articulation focus',
              startDate: new Date('2024-01-20'),
              endDate: new Date('2024-03-20'),
              outcome: 'Significant improvement'
            }
          ],
          progressNotes: [
            {
              id: '1',
              content: 'Initial session',
              createdAt: new Date('2024-01-20'),
              sessionDate: new Date('2024-01-20'),
              category: 'treatment'
            }
          ],
          assessments: [
            {
              id: '1',
              type: 'Initial Assessment',
              date: new Date('2024-01-15'),
              findings: 'Moderate expressive language disorder'
            }
          ],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-03-20')
        }
      ]

      const mockTimeline = {
        patientId: mockPatientId,
        records: mockRecords,
        chronologicalEvents: [
          {
            id: '1',
            recordId: mockRecords[0].id,
            eventType: 'assessment',
            date: new Date('2024-01-15'),
            description: 'Initial Assessment',
            details: { findings: 'Moderate expressive language disorder' }
          },
          {
            id: '2',
            recordId: mockRecords[0].id,
            eventType: 'diagnosis',
            date: new Date('2024-01-15'),
            description: 'Diagnosed with F80.1 - Expressive language disorder',
            details: { code: 'F80.1', severity: 'moderate' }
          },
          {
            id: '3',
            recordId: mockRecords[0].id,
            eventType: 'treatment_start',
            date: new Date('2024-01-20'),
            description: 'Started speech therapy - articulation focus',
            details: {}
          },
          {
            id: '4',
            recordId: mockRecords[0].id,
            eventType: 'progress_note',
            date: new Date('2024-01-20'),
            description: 'Initial session',
            details: { category: 'treatment' }
          },
          {
            id: '5',
            recordId: mockRecords[0].id,
            eventType: 'treatment_end',
            date: new Date('2024-03-20'),
            description: 'Completed speech therapy - articulation focus',
            details: { outcome: 'Significant improvement' }
          }
        ],
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-03-20')
      }

      mockMedicalRecordRepository.getTimelineView.mockResolvedValue(mockTimeline)

      // Act: Get treatment timeline
      const timeline = await medicalRecordManager.getTimelineView(mockPatientId)

      // Assert: Timeline generated correctly
      expect(timeline).toBeDefined()
      expect(timeline.chronologicalEvents).toHaveLength(5)
      expect(timeline.chronologicalEvents[0].eventType).toBe('assessment')
      expect(timeline.chronologicalEvents[1].eventType).toBe('diagnosis')
      expect(timeline.chronologicalEvents[2].eventType).toBe('treatment_start')
      expect(timeline.chronologicalEvents[4].eventType).toBe('treatment_end')

      // Verify chronological order
      for (let i = 1; i < timeline.chronologicalEvents.length; i++) {
        expect(timeline.chronologicalEvents[i].date.getTime())
          .toBeGreaterThanOrEqual(timeline.chronologicalEvents[i - 1].date.getTime())
      }
    })

    it('should perform integrity checks on medical data', async () => {
      // Arrange: Medical record with potential issues
      const medicalRecordData: MedicalRecordData = {
        diagnosis: [
          {
            code: 'F80.1',
            description: 'Expressive language disorder',
            diagnosedAt: new Date('2024-01-15'),
            severity: 'moderate'
          }
        ],
        medications: [
          {
            name: 'Aspirin',
            dosage: '100mg',
            frequency: 'Once daily',
            startDate: new Date('2024-01-20'),
            prescribedBy: 'Dr. Silva'
          },
          {
            name: 'Warfarin',
            dosage: '5mg',
            frequency: 'Once daily',
            startDate: new Date('2024-01-20'),
            prescribedBy: 'Dr. Silva'
          }
        ],
        allergies: [
          {
            allergen: 'Penicillin',
            reaction: 'Anaphylaxis',
            severity: 'life_threatening',
            diagnosedAt: new Date('2020-05-10')
          }
        ]
      }

      const mockRecordId = new MedicalRecordId(crypto.randomUUID())
      const mockMedicalRecord = {
        id: mockRecordId,
        patientId: mockPatientId,
        diagnosis: medicalRecordData.diagnosis!.map(d => ({
          code: d.code,
          description: d.description,
          diagnosedAt: d.diagnosedAt,
          severity: d.severity
        })),
        medications: medicalRecordData.medications!.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          startDate: m.startDate,
          prescribedBy: m.prescribedBy,
          isActive: () => true
        })),
        allergies: medicalRecordData.allergies!.map(a => ({
          allergen: a.allergen,
          reaction: a.reaction,
          severity: a.severity,
          diagnosedAt: a.diagnosedAt
        })),
        treatmentHistory: [],
        progressNotes: [],
        assessments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockMedicalRecordRepository.create.mockResolvedValue(mockMedicalRecord)

      // Act: Create medical record (triggers integrity checks)
      const createdRecord = await medicalRecordManager.createMedicalRecord(
        mockPatientId,
        medicalRecordData,
        new UserId(mockUserId)
      )

      // Perform integrity checks
      const integrityCheck = await medicalRecordManager.performIntegrityChecks(createdRecord)

      // Assert: Integrity checks performed
      expect(integrityCheck).toBeDefined()
      expect(integrityCheck.checks).toBeDefined()
      expect(integrityCheck.checks.length).toBeGreaterThan(0)

      // Check for medication interaction warning (Aspirin + Warfarin)
      const medicationCheck = integrityCheck.checks.find(c => c.checkType === 'medication_interaction')
      expect(medicationCheck).toBeDefined()
      expect(medicationCheck?.status).toBe('warning')
      expect(medicationCheck?.message).toContain('warfarin')
      expect(medicationCheck?.message).toContain('aspirin')
    })
  })
})
