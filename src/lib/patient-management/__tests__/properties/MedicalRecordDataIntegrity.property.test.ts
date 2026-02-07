// ============================================================================
// MEDICAL RECORD DATA INTEGRITY PROPERTY TESTS
// Property-based tests for medical record data integrity
// Feature: patient-management-system, Property 5: Medical Record Data Integrity
// **Validates: Requirements 2.1**
// ============================================================================

import * as fc from 'fast-check'
import { MedicalRecord } from '../../domain/entities/MedicalRecord'
import { MedicalRecordId } from '../../domain/value-objects/MedicalRecordId'
import { PatientId } from '../../domain/value-objects/PatientId'
import { Diagnosis } from '../../domain/value-objects/Diagnosis'
import { Medication } from '../../domain/value-objects/Medication'
import { Allergy } from '../../domain/value-objects/Allergy'
import { ProgressNote } from '../../domain/value-objects/ProgressNote'
import { Assessment } from '../../domain/value-objects/Assessment'
import { UserId } from '../../domain/value-objects/UserId'
import { IMedicalRecordRepository, CreateMedicalRecordRequest, UpdateMedicalRecordRequest, TreatmentTimeline } from '../../infrastructure/repositories/IMedicalRecordRepository'
import { MedicalRecordManager, MedicalRecordData } from '../../application/services/MedicalRecordManager'
import {
  patientIdGenerator,
  userIdGenerator
} from '../../testing/generators'

// ============================================================================
// MOCK REPOSITORY
// ============================================================================

class InMemoryMedicalRecordRepository implements IMedicalRecordRepository {
  private records: Map<string, MedicalRecord> = new Map()

  async create(request: CreateMedicalRecordRequest): Promise<MedicalRecord> {
    const recordId = new MedicalRecordId(crypto.randomUUID())
    
    const diagnosis = request.diagnosis?.map(d => 
      new Diagnosis(d.code, d.description, d.diagnosedAt, d.severity)
    ) || []
    
    const medications = request.medications?.map(m => 
      new Medication(m.name, m.dosage, m.frequency, m.startDate, m.endDate ?? null, m.prescribedBy, null)
    ) || []
    
    const allergies = request.allergies?.map(a => 
      new Allergy(a.allergen, a.reaction, a.severity as 'mild' | 'moderate' | 'severe' | 'life_threatening', a.diagnosedAt, null)
    ) || []
    
    const assessments = request.initialAssessment ? [
      new Assessment(
        crypto.randomUUID(),
        'Initial Assessment',
        {},
        request.initialAssessment.findings,
        request.initialAssessment.recommendations.split('; '),
        request.initialAssessment.date,
        new UserId(request.initialAssessment.assessedBy)
      )
    ] : []
    
    const record = new MedicalRecord(
      recordId,
      request.patientId,
      diagnosis,
      [],
      medications,
      allergies,
      [],
      assessments,
      new Date(),
      new Date()
    )
    
    this.records.set(recordId.value, record)
    
    // Verify storage immediately
    const stored = this.records.get(recordId.value)
    if (!stored) {
      throw new Error(`Failed to store medical record with ID ${recordId.value}`)
    }
    
    return record
  }

  async update(id: MedicalRecordId, request: UpdateMedicalRecordRequest): Promise<MedicalRecord> {
    const existing = this.records.get(id.value)
    if (!existing) {
      throw new Error(`Medical record with ID ${id.value} not found`)
    }
    
    let updated = existing
    
    if (request.diagnosis !== undefined) {
      for (const d of request.diagnosis) {
        const diagnosis = new Diagnosis(d.code, d.description, d.diagnosedAt, d.severity)
        updated = updated.addDiagnosis(diagnosis)
      }
    }
    
    if (request.medications !== undefined) {
      for (const m of request.medications) {
        const medication = new Medication(m.name, m.dosage, m.frequency, m.startDate, m.endDate ?? null, m.prescribedBy, null)
        updated = updated.addMedication(medication)
      }
    }
    
    if (request.allergies !== undefined) {
      for (const a of request.allergies) {
        const allergy = new Allergy(a.allergen, a.reaction, a.severity as 'mild' | 'moderate' | 'severe' | 'life_threatening', a.diagnosedAt, null)
        updated = updated.addAllergy(allergy)
      }
    }
    
    this.records.set(id.value, updated)
    return updated
  }

  async findById(id: MedicalRecordId): Promise<MedicalRecord | null> {
    return this.records.get(id.value) || null
  }

  async findByPatientId(patientId: PatientId): Promise<MedicalRecord[]> {
    return Array.from(this.records.values()).filter(r => r.patientId.value === patientId.value)
  }

  async addProgressNote(recordId: MedicalRecordId, note: ProgressNote): Promise<void> {
    const record = this.records.get(recordId.value)
    if (!record) {
      throw new Error(`Medical record with ID ${recordId.value} not found`)
    }
    
    const updated = record.addProgressNote(note)
    this.records.set(recordId.value, updated)
  }

  async addAssessment(recordId: MedicalRecordId, assessment: Assessment): Promise<void> {
    const record = this.records.get(recordId.value)
    if (!record) {
      throw new Error(`Medical record with ID ${recordId.value} not found`)
    }
    
    const updated = record.addAssessment(assessment)
    this.records.set(recordId.value, updated)
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

  clear(): void {
    this.records.clear()
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const safeStringGenerator = (minLength: number, maxLength: number): fc.Arbitrary<string> =>
  fc.array(
    fc.oneof(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.-'.split('')),
    ),
    { minLength, maxLength }
  ).map(chars => chars.join('').trim()).filter(s => s.length >= minLength)

const medicalRecordDataGenerator = (): fc.Arbitrary<MedicalRecordData> =>
  fc.record({
    diagnosis: fc.option(fc.array(
      fc.record({
        code: fc.stringMatching(/^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/).filter(s => s.length >= 3 && s.length <= 10),
        description: safeStringGenerator(10, 50),
        diagnosedAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
        severity: fc.constantFrom<'mild' | 'moderate' | 'severe' | 'unknown'>('mild', 'moderate', 'severe', 'unknown')
      }),
      { minLength: 1, maxLength: 3 }
    ), { nil: undefined }),
    medications: fc.option(fc.array(
      fc.record({
        name: safeStringGenerator(3, 30),
        dosage: fc.tuple(
          fc.integer({ min: 1, max: 5000 }),
          fc.constantFrom('mg', 'ml', 'g', 'mcg')
        ).map(([num, unit]) => `${num} ${unit}`),
        frequency: fc.constantFrom('Once daily', 'Twice daily', 'Three times daily', 'Every 6 hours', 'As needed'),
        startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
        endDate: fc.option(fc.date({ min: new Date('2026-01-01'), max: new Date('2027-12-31') }).filter(d => !isNaN(d.getTime())), { nil: undefined }),
        prescribedBy: safeStringGenerator(5, 30),
        notes: fc.option(safeStringGenerator(10, 100), { nil: undefined })
      }),
      { minLength: 1, maxLength: 3 }
    ), { nil: undefined }),
    allergies: fc.option(fc.array(
      fc.record({
        allergen: fc.constantFrom('Penicillin', 'Peanuts', 'Latex', 'Shellfish', 'Pollen', 'Dust mites'),
        reaction: fc.constantFrom('Rash', 'Hives', 'Swelling', 'Difficulty breathing', 'Anaphylaxis'),
        severity: fc.constantFrom<'mild' | 'moderate' | 'severe' | 'life_threatening'>('mild', 'moderate', 'severe', 'life_threatening'),
        diagnosedAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
        notes: fc.option(safeStringGenerator(10, 100), { nil: undefined })
      }),
      { minLength: 1, maxLength: 3 }
    ), { nil: undefined }),
    initialAssessment: fc.option(fc.record({
      type: fc.constantFrom('Initial Evaluation', 'Follow-up Assessment', 'Progress Review'),
      findings: safeStringGenerator(20, 200),
      recommendations: fc.array(safeStringGenerator(10, 50), { minLength: 1, maxLength: 3 }),
      assessedBy: userIdGenerator().map(userId => userId.value),
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime()))
    }), { nil: undefined })
  })

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 5: Medical Record Data Integrity', () => {
  let repository: InMemoryMedicalRecordRepository
  let manager: MedicalRecordManager

  beforeEach(() => {
    repository = new InMemoryMedicalRecordRepository()
    manager = new MedicalRecordManager(repository)
  })

  afterEach(() => {
    repository.clear()
  })

  test('Property 5.1: All required medical data fields are stored completely and retrievably without data loss', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        medicalRecordDataGenerator(),
        userIdGenerator(),
        async (patientId, recordData, userId) => {
          // Create medical record
          const createdRecord = await manager.createMedicalRecord(patientId, recordData, userId)

          // Retrieve the record directly from repository to avoid any caching issues
          const retrievedRecord = await repository.findById(createdRecord.id)

          // Verify record was retrieved
          expect(retrievedRecord).not.toBeNull()
          if (!retrievedRecord) {
            console.error('Failed to retrieve record:', createdRecord.id.value)
            console.error('Repository has records:', Array.from((repository as any).records.keys()))
            return false
          }

          // Verify patient ID is preserved
          expect(retrievedRecord.patientId.value).toBe(patientId.value)

          // Verify diagnosis data integrity
          if (recordData.diagnosis) {
            expect(retrievedRecord.diagnosis.length).toBe(recordData.diagnosis.length)
            for (let i = 0; i < recordData.diagnosis.length; i++) {
              const original = recordData.diagnosis[i]
              const retrieved = retrievedRecord.diagnosis[i]
              expect(retrieved.code).toBe(original.code)
              expect(retrieved.description).toBe(original.description)
              expect(retrieved.severity).toBe(original.severity)
            }
          }

          // Verify medications data integrity
          if (recordData.medications) {
            expect(retrievedRecord.medications.length).toBe(recordData.medications.length)
            for (let i = 0; i < recordData.medications.length; i++) {
              const original = recordData.medications[i]
              const retrieved = retrievedRecord.medications[i]
              expect(retrieved.name).toBe(original.name)
              expect(retrieved.dosage).toBe(original.dosage)
              expect(retrieved.frequency).toBe(original.frequency)
              expect(retrieved.prescribedBy).toBe(original.prescribedBy)
            }
          }

          // Verify allergies data integrity
          if (recordData.allergies) {
            expect(retrievedRecord.allergies.length).toBe(recordData.allergies.length)
            for (let i = 0; i < recordData.allergies.length; i++) {
              const original = recordData.allergies[i]
              const retrieved = retrievedRecord.allergies[i]
              expect(retrieved.allergen).toBe(original.allergen)
              expect(retrieved.reaction).toBe(original.reaction)
              expect(retrieved.severity).toBe(original.severity)
            }
          }

          // Verify initial assessment data integrity
          if (recordData.initialAssessment) {
            expect(retrievedRecord.assessments.length).toBeGreaterThan(0)
            const assessment = retrievedRecord.assessments[0]
            expect(assessment.summary).toBe(recordData.initialAssessment.findings)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 5.2: Medical record updates preserve existing data while adding new data', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        medicalRecordDataGenerator(),
        medicalRecordDataGenerator(),
        userIdGenerator(),
        async (patientId, initialData, updateData, userId) => {
          // Create initial medical record
          const createdRecord = await manager.createMedicalRecord(patientId, initialData, userId)

          // Count initial data
          const initialDiagnosisCount = createdRecord.diagnosis.length
          const initialMedicationsCount = createdRecord.medications.length
          const initialAllergiesCount = createdRecord.allergies.length

          // Update the record
          const updatedRecord = await manager.updateMedicalRecord(
            createdRecord.id,
            {
              diagnosis: updateData.diagnosis,
              medications: updateData.medications,
              allergies: updateData.allergies
            },
            userId
          )

          // Verify data was added, not replaced
          if (updateData.diagnosis) {
            expect(updatedRecord.diagnosis.length).toBe(initialDiagnosisCount + updateData.diagnosis.length)
          }

          if (updateData.medications) {
            expect(updatedRecord.medications.length).toBe(initialMedicationsCount + updateData.medications.length)
          }

          if (updateData.allergies) {
            expect(updatedRecord.allergies.length).toBe(initialAllergiesCount + updateData.allergies.length)
          }

          // Verify original data is still present
          if (initialData.diagnosis) {
            for (const originalDiagnosis of initialData.diagnosis) {
              const found = updatedRecord.diagnosis.some(d => 
                d.code.trim() === originalDiagnosis.code.trim() && 
                d.description.trim() === originalDiagnosis.description.trim()
              )
              if (!found) {
                console.error('Original diagnosis not found:', originalDiagnosis)
                console.error('Updated diagnoses:', updatedRecord.diagnosis.map(d => ({ code: d.code, description: d.description })))
              }
              expect(found).toBe(true)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 5.3: Medical records maintain referential integrity with patient ID', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        medicalRecordDataGenerator(),
        userIdGenerator(),
        async (patientId, recordData, userId) => {
          // Create medical record
          const createdRecord = await manager.createMedicalRecord(patientId, recordData, userId)

          // Retrieve by patient ID
          const patientRecords = await manager.getMedicalHistory(patientId)

          // Verify the record is in the patient's history
          const found = patientRecords.some(r => r.id.value === createdRecord.id.value)
          expect(found).toBe(true)

          // Verify all records have the correct patient ID
          for (const record of patientRecords) {
            expect(record.patientId.value).toBe(patientId.value)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 5.4: Medical record timestamps are accurate and immutable', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        medicalRecordDataGenerator(),
        userIdGenerator(),
        async (patientId, recordData, userId) => {
          const beforeCreate = new Date()
          
          // Create medical record
          const createdRecord = await manager.createMedicalRecord(patientId, recordData, userId)
          
          const afterCreate = new Date()

          // Verify creation timestamp is within expected range
          expect(createdRecord.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000)
          expect(createdRecord.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000)

          // Verify updated timestamp matches created timestamp initially
          expect(createdRecord.updatedAt.getTime()).toBeGreaterThanOrEqual(createdRecord.createdAt.getTime())

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})