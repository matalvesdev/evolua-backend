// ============================================================================
// MEDICAL RECORD MANAGER SERVICE TESTS
// Unit tests for medical record service layer
// ============================================================================

import { MedicalRecordManager } from '../../../application/services/MedicalRecordManager'
import { MedicalRecord } from '../../../domain/entities/MedicalRecord'
import { MedicalRecordId } from '../../../domain/value-objects/MedicalRecordId'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { UserId } from '../../../domain/value-objects/UserId'
import { Diagnosis } from '../../../domain/value-objects/Diagnosis'
import { Medication } from '../../../domain/value-objects/Medication'
import { Allergy } from '../../../domain/value-objects/Allergy'
import { Assessment } from '../../../domain/value-objects/Assessment'
import { ProgressNote } from '../../../domain/value-objects/ProgressNote'
import { 
  IMedicalRecordRepository, 
  TreatmentTimeline,
  CreateMedicalRecordRequest,
  UpdateMedicalRecordRequest
} from '../../../infrastructure/repositories/IMedicalRecordRepository'

// Mock repository implementation
class MockMedicalRecordRepository implements IMedicalRecordRepository {
  private records: Map<string, MedicalRecord> = new Map()
  private progressNotes: Map<string, ProgressNote[]> = new Map()
  private assessments: Map<string, Assessment[]> = new Map()

  async create(request: CreateMedicalRecordRequest): Promise<MedicalRecord> {
    const id = MedicalRecordId.generate()
    const now = new Date()

    const diagnosis = request.diagnosis?.map((d: CreateMedicalRecordRequest['diagnosis'][0]) => new Diagnosis(
      d.code,
      d.description,
      d.diagnosedAt,
      d.severity
    )) || []

    const medications = request.medications?.map((m: CreateMedicalRecordRequest['medications'][0]) => new Medication(
      m.name,
      m.dosage,
      m.frequency,
      m.startDate,
      m.endDate || null,
      m.prescribedBy,
      null
    )) || []

    const allergies = request.allergies?.map((a: CreateMedicalRecordRequest['allergies'][0]) => new Allergy(
      a.allergen,
      a.reaction,
      a.severity,
      a.diagnosedAt,
      null
    )) || []

    const assessments = request.initialAssessment ? [
      new Assessment(
        crypto.randomUUID(),
        'Initial Assessment',
        {},
        request.initialAssessment.findings,
        [request.initialAssessment.recommendations],
        request.initialAssessment.date,
        new UserId(request.initialAssessment.assessedBy)
      )
    ] : []

    const record = new MedicalRecord(
      id,
      request.patientId,
      diagnosis,
      [],
      medications,
      allergies,
      [],
      assessments,
      now,
      now
    )

    this.records.set(id.value, record)
    return record
  }

  async update(id: MedicalRecordId, request: UpdateMedicalRecordRequest): Promise<MedicalRecord> {
    const existing = this.records.get(id.value)
    if (!existing) {
      throw new Error(`Medical record with ID ${id.value} not found`)
    }

    // Create updated record with new data
    const diagnosis = request.diagnosis?.map((d: UpdateMedicalRecordRequest['diagnosis'][0]) => new Diagnosis(
      d.code,
      d.description,
      d.diagnosedAt,
      d.severity
    )) || existing.diagnosis

    const medications = request.medications?.map((m: UpdateMedicalRecordRequest['medications'][0]) => new Medication(
      m.name,
      m.dosage,
      m.frequency,
      m.startDate,
      m.endDate || null,
      m.prescribedBy,
      null
    )) || existing.medications

    const allergies = request.allergies?.map((a: UpdateMedicalRecordRequest['allergies'][0]) => new Allergy(
      a.allergen,
      a.reaction,
      a.severity,
      a.diagnosedAt,
      null
    )) || existing.allergies

    const updated = new MedicalRecord(
      id,
      existing.patientId,
      diagnosis,
      [...existing.treatmentHistory],
      medications,
      allergies,
      existing.progressNotes,
      existing.assessments,
      existing.createdAt,
      new Date()
    )

    this.records.set(id.value, updated)
    return updated
  }

  async findById(id: MedicalRecordId): Promise<MedicalRecord | null> {
    return this.records.get(id.value) || null
  }

  async findByPatientId(patientId: PatientId): Promise<MedicalRecord[]> {
    return Array.from(this.records.values()).filter(record => 
      record.patientId.value === patientId.value
    )
  }

  async addProgressNote(recordId: MedicalRecordId, note: ProgressNote): Promise<void> {
    const notes = this.progressNotes.get(recordId.value) || []
    notes.push(note)
    this.progressNotes.set(recordId.value, notes)
  }

  async addAssessment(recordId: MedicalRecordId, assessment: Assessment): Promise<void> {
    const assessments = this.assessments.get(recordId.value) || []
    assessments.push(assessment)
    this.assessments.set(recordId.value, assessments)
  }

  async getTimelineView(patientId: PatientId): Promise<TreatmentTimeline> {
    const records = await this.findByPatientId(patientId)
    return {
      patientId,
      records,
      chronologicalEvents: []
    }
  }

  async delete(id: MedicalRecordId): Promise<void> {
    this.records.delete(id.value)
  }

  async exists(id: MedicalRecordId): Promise<boolean> {
    return this.records.has(id.value)
  }
}

describe('MedicalRecordManager', () => {
  let medicalRecordManager: MedicalRecordManager
  let mockRepository: MockMedicalRecordRepository

  beforeEach(() => {
    mockRepository = new MockMedicalRecordRepository()
    medicalRecordManager = new MedicalRecordManager(mockRepository)
  })

  describe('createMedicalRecord', () => {
    it('should create a medical record with valid data', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const recordData = {
        diagnosis: [{
          code: 'F80.1',
          description: 'Expressive language disorder',
          diagnosedAt: new Date('2024-01-15'),
          severity: 'moderate' as const
        }],
        medications: [{
          name: 'Speech therapy exercises',
          dosage: '30 minutes',
          frequency: 'Daily',
          startDate: new Date('2024-01-16'),
          prescribedBy: 'Dr. Silva',
          notes: 'Focus on articulation'
        }],
        allergies: [{
          allergen: 'Latex',
          reaction: 'Skin rash',
          severity: 'mild' as const,
          diagnosedAt: new Date('2024-01-10'),
          notes: 'Avoid latex gloves'
        }],
        initialAssessment: {
          type: 'Initial Speech Assessment',
          findings: 'Patient shows difficulty with expressive language',
          recommendations: ['Regular speech therapy', 'Home practice exercises'],
          assessedBy: createdBy.value,
          date: new Date('2024-01-15')
        }
      }

      const result = await medicalRecordManager.createMedicalRecord(patientId, recordData, createdBy)

      expect(result).toBeInstanceOf(MedicalRecord)
      expect(result.patientId).toEqual(patientId)
      expect(result.diagnosis).toHaveLength(1)
      expect(result.diagnosis[0].code).toBe('F80.1')
      expect(result.medications).toHaveLength(1)
      expect(result.medications[0].name).toBe('Speech therapy exercises')
      expect(result.allergies).toHaveLength(1)
      expect(result.allergies[0].allergen).toBe('Latex')
      expect(result.assessments).toHaveLength(1)
    })

    it('should validate clinical data and reject invalid data', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const invalidRecordData = {
        diagnosis: [{
          code: '', // Invalid: empty code
          description: 'Some diagnosis',
          diagnosedAt: new Date(),
          severity: 'moderate' as const
        }]
      }

      await expect(
        medicalRecordManager.createMedicalRecord(patientId, invalidRecordData, createdBy)
      ).rejects.toThrow('Clinical data validation failed')
    })

    it('should reject future dates for diagnosis', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      const invalidRecordData = {
        diagnosis: [{
          code: 'F80.1',
          description: 'Some diagnosis',
          diagnosedAt: futureDate, // Invalid: future date
          severity: 'moderate' as const
        }]
      }

      await expect(
        medicalRecordManager.createMedicalRecord(patientId, invalidRecordData, createdBy)
      ).rejects.toThrow('Diagnosis date cannot be in the future')
    })
  })

  describe('updateMedicalRecord', () => {
    it('should update an existing medical record', async () => {
      // First create a record
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const initialData = {
        diagnosis: [{
          code: 'F80.1',
          description: 'Initial diagnosis',
          diagnosedAt: new Date('2024-01-15'),
          severity: 'moderate' as const
        }]
      }

      const record = await medicalRecordManager.createMedicalRecord(patientId, initialData, createdBy)

      // Now update it
      const updateData = {
        diagnosis: [{
          code: 'F80.2',
          description: 'Updated diagnosis',
          diagnosedAt: new Date('2024-01-16'),
          severity: 'severe' as const
        }]
      }

      const updatedRecord = await medicalRecordManager.updateMedicalRecord(
        record.id, 
        updateData, 
        createdBy
      )

      expect(updatedRecord.diagnosis).toHaveLength(1)
      expect(updatedRecord.diagnosis[0].code).toBe('F80.2')
      expect(updatedRecord.diagnosis[0].description).toBe('Updated diagnosis')
    })

    it('should throw error when updating non-existent record', async () => {
      const nonExistentId = MedicalRecordId.generate()
      const createdBy = UserId.generate()
      const updateData = {
        diagnosis: [{
          code: 'F80.1',
          description: 'Some diagnosis',
          diagnosedAt: new Date(),
          severity: 'moderate' as const
        }]
      }

      await expect(
        medicalRecordManager.updateMedicalRecord(nonExistentId, updateData, createdBy)
      ).rejects.toThrow('Medical record with ID')
    })
  })

  describe('addProgressNote', () => {
    it('should add a progress note to a medical record', async () => {
      // Create a record first
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const record = await medicalRecordManager.createMedicalRecord(patientId, {}, createdBy)

      const noteData = {
        content: 'Patient showed improvement in articulation exercises',
        sessionDate: new Date('2024-01-20'),
        category: 'treatment' as const,
        createdBy: createdBy.value
      }

      await expect(
        medicalRecordManager.addProgressNote(record.id, noteData)
      ).resolves.not.toThrow()
    })

    it('should validate progress note data', async () => {
      const recordId = MedicalRecordId.generate()
      const invalidNoteData = {
        content: '', // Invalid: empty content
        sessionDate: new Date(),
        category: 'treatment' as const,
        createdBy: 'user-123'
      }

      await expect(
        medicalRecordManager.addProgressNote(recordId, invalidNoteData)
      ).rejects.toThrow('Progress note content is required')
    })

    it('should reject future session dates', async () => {
      const recordId = MedicalRecordId.generate()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      const invalidNoteData = {
        content: 'Some content',
        sessionDate: futureDate, // Invalid: future date
        category: 'treatment' as const,
        createdBy: 'user-123'
      }

      await expect(
        medicalRecordManager.addProgressNote(recordId, invalidNoteData)
      ).rejects.toThrow('Progress note session date cannot be in the future')
    })
  })

  describe('addAssessment', () => {
    it('should add an assessment to a medical record', async () => {
      // Create a record first
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const record = await medicalRecordManager.createMedicalRecord(patientId, {}, createdBy)

      const assessmentData = {
        type: 'Speech Assessment',
        findings: 'Patient shows significant improvement',
        recommendations: ['Continue current therapy', 'Add new exercises'],
        assessedBy: createdBy.value,
        date: new Date('2024-01-20'),
        results: { score: 85, category: 'good' }
      }

      await expect(
        medicalRecordManager.addAssessment(record.id, assessmentData)
      ).resolves.not.toThrow()
    })

    it('should validate assessment data', async () => {
      const recordId = MedicalRecordId.generate()
      const invalidAssessmentData = {
        type: '', // Invalid: empty type
        findings: 'Some findings',
        recommendations: ['Some recommendation'],
        assessedBy: 'user-123',
        date: new Date()
      }

      await expect(
        medicalRecordManager.addAssessment(recordId, invalidAssessmentData)
      ).rejects.toThrow('Assessment type is required')
    })
  })

  describe('performIntegrityChecks', () => {
    it('should detect medication interactions', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const recordData = {
        medications: [
          {
            name: 'Warfarin',
            dosage: '5mg',
            frequency: 'Daily',
            startDate: new Date('2024-01-15'),
            prescribedBy: 'Dr. Silva'
          },
          {
            name: 'Aspirin',
            dosage: '100mg',
            frequency: 'Daily',
            startDate: new Date('2024-01-16'),
            prescribedBy: 'Dr. Silva'
          }
        ]
      }

      const record = await medicalRecordManager.createMedicalRecord(patientId, recordData, createdBy)
      const integrityCheck = await medicalRecordManager.performIntegrityChecks(record)

      expect(integrityCheck.overallStatus).toBe('warning')
      const medicationCheck = integrityCheck.checks.find(c => c.checkType === 'medication_interaction')
      expect(medicationCheck?.status).toBe('warning')
      expect(medicationCheck?.message).toContain('warfarin and aspirin')
    })

    it('should detect allergy conflicts with medications', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const recordData = {
        medications: [{
          name: 'Penicillin',
          dosage: '500mg',
          frequency: 'Twice daily',
          startDate: new Date('2024-01-15'),
          prescribedBy: 'Dr. Silva'
        }],
        allergies: [{
          allergen: 'Penicillin',
          reaction: 'Severe rash',
          severity: 'severe' as const,
          diagnosedAt: new Date('2024-01-10')
        }]
      }

      const record = await medicalRecordManager.createMedicalRecord(patientId, recordData, createdBy)
      const integrityCheck = await medicalRecordManager.performIntegrityChecks(record)

      expect(integrityCheck.overallStatus).toBe('failed')
      const allergyCheck = integrityCheck.checks.find(c => c.checkType === 'allergy_conflict')
      expect(allergyCheck?.status).toBe('failed')
      expect(allergyCheck?.message).toContain('Penicillin')
    })

    it('should detect duplicate diagnosis codes', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      const recordData = {
        diagnosis: [
          {
            code: 'F80.1',
            description: 'First diagnosis',
            diagnosedAt: new Date('2024-01-15'),
            severity: 'moderate' as const
          },
          {
            code: 'F80.1', // Duplicate code
            description: 'Second diagnosis',
            diagnosedAt: new Date('2024-01-16'),
            severity: 'severe' as const
          }
        ]
      }

      const record = await medicalRecordManager.createMedicalRecord(patientId, recordData, createdBy)
      const integrityCheck = await medicalRecordManager.performIntegrityChecks(record)

      expect(integrityCheck.overallStatus).toBe('warning')
      const diagnosisCheck = integrityCheck.checks.find(c => c.checkType === 'diagnosis_consistency')
      expect(diagnosisCheck?.status).toBe('warning')
      expect(diagnosisCheck?.message).toContain('Duplicate diagnosis codes')
    })
  })

  describe('getTimelineView', () => {
    it('should generate treatment timeline for a patient', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      
      // Create a medical record
      await medicalRecordManager.createMedicalRecord(patientId, {
        diagnosis: [{
          code: 'F80.1',
          description: 'Speech disorder',
          diagnosedAt: new Date('2024-01-15'),
          severity: 'moderate' as const
        }]
      }, createdBy)

      const timeline = await medicalRecordManager.getTimelineView(patientId)

      expect(timeline.patientId).toEqual(patientId)
      expect(timeline.records).toHaveLength(1)
      expect(timeline.chronologicalEvents).toBeDefined()
    })
  })

  describe('clinical data validation', () => {
    it('should validate ICD-10 diagnosis codes', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      
      // Valid ICD-10 code should pass
      const validData = {
        diagnosis: [{
          code: 'F80.1',
          description: 'Valid diagnosis',
          diagnosedAt: new Date('2024-01-15'),
          severity: 'moderate' as const
        }]
      }

      await expect(
        medicalRecordManager.createMedicalRecord(patientId, validData, createdBy)
      ).resolves.not.toThrow()

      // Invalid ICD-10 code should generate warning but not fail
      const invalidCodeData = {
        diagnosis: [{
          code: 'INVALID',
          description: 'Invalid diagnosis code',
          diagnosedAt: new Date('2024-01-15'),
          severity: 'moderate' as const
        }]
      }

      // Should not throw but may generate warnings
      await expect(
        medicalRecordManager.createMedicalRecord(patientId, invalidCodeData, createdBy)
      ).resolves.not.toThrow()
    })

    it('should validate medication data completeness', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      
      const incompleteData = {
        medications: [{
          name: 'Some medication',
          dosage: '', // Invalid: empty dosage
          frequency: 'Daily',
          startDate: new Date('2024-01-15'),
          prescribedBy: 'Dr. Silva'
        }]
      }

      await expect(
        medicalRecordManager.createMedicalRecord(patientId, incompleteData, createdBy)
      ).rejects.toThrow('Medication dosage is required')
    })

    it('should validate allergy severity values', async () => {
      const patientId = PatientId.generate()
      const createdBy = UserId.generate()
      
      const invalidSeverityData = {
        allergies: [{
          allergen: 'Peanuts',
          reaction: 'Anaphylaxis',
          severity: 'invalid_severity' as any, // Invalid severity
          diagnosedAt: new Date('2024-01-15')
        }]
      }

      await expect(
        medicalRecordManager.createMedicalRecord(patientId, invalidSeverityData, createdBy)
      ).rejects.toThrow('Invalid allergy severity')
    })
  })
})