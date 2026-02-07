// ============================================================================
// CHRONOLOGICAL TIMELINE CONSISTENCY PROPERTY TESTS
// Property-based tests for treatment timeline chronological order
// Feature: patient-management-system, Property 7: Chronological Treatment Timeline Consistency
// **Validates: Requirements 2.6**
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
import { IMedicalRecordRepository, CreateMedicalRecordRequest, TreatmentTimeline, ChronologicalEvent } from '../../infrastructure/repositories/IMedicalRecordRepository'
import { MedicalRecordManager } from '../../application/services/MedicalRecordManager'
import {
  patientIdGenerator,
  userIdGenerator,
  diagnosisGenerator,
  progressNoteGenerator,
  assessmentGenerator,
  medicationGenerator,
  allergyGenerator
} from '../../testing/generators'

// ============================================================================
// MOCK REPOSITORY WITH TIMELINE SUPPORT
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
    return record
  }

  async update(id: MedicalRecordId, request: any): Promise<MedicalRecord> {
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
    
    // Build chronological events from all records
    const events: ChronologicalEvent[] = []
    
    for (const record of records) {
      // Add diagnosis events
      for (const diagnosis of record.diagnosis) {
        events.push({
          date: diagnosis.diagnosedAt,
          type: 'diagnosis',
          description: `Diagnosis: ${diagnosis.description}`,
          recordId: record.id,
          details: diagnosis
        })
      }
      
      // Add progress note events
      for (const note of record.progressNotes) {
        events.push({
          date: note.sessionDate,
          type: 'progress_note',
          description: `Progress Note: ${note.content.substring(0, 50)}...`,
          recordId: record.id,
          details: note
        })
      }
      
      // Add assessment events
      for (const assessment of record.assessments) {
        events.push({
          date: assessment.date,
          type: 'assessment',
          description: `Assessment: ${assessment.type}`,
          recordId: record.id,
          details: assessment
        })
      }
      
      // Add medication events
      for (const medication of record.medications) {
        events.push({
          date: medication.startDate,
          type: 'medication',
          description: `Medication Started: ${medication.name}`,
          recordId: record.id,
          details: medication
        })
      }
      
      // Add allergy events
      for (const allergy of record.allergies) {
        events.push({
          date: allergy.diagnosedAt,
          type: 'allergy',
          description: `Allergy Identified: ${allergy.allergen}`,
          recordId: record.id,
          details: allergy
        })
      }
    }
    
    // Sort events chronologically
    events.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    return {
      patientId,
      records,
      chronologicalEvents: events
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
// GENERATORS FOR MEDICAL EVENTS
// ============================================================================

// Generator for a sequence of medical events with dates
const medicalEventSequenceGenerator = () => {
  return fc.tuple(
    fc.array(
      fc.tuple(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.constantFrom<'diagnosis' | 'progress_note' | 'assessment' | 'medication' | 'allergy'>(
          'diagnosis', 'progress_note', 'assessment', 'medication', 'allergy'
        )
      ),
      { minLength: 3, maxLength: 10 }
    )
  ).map(([events]) => {
    // Sort events by date to ensure we have a known chronological order
    return events.sort((a, b) => a[0].getTime() - b[0].getTime())
  })
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 7: Chronological Treatment Timeline Consistency', () => {
  let repository: InMemoryMedicalRecordRepository
  let manager: MedicalRecordManager

  beforeEach(() => {
    repository = new InMemoryMedicalRecordRepository()
    manager = new MedicalRecordManager(repository)
  })

  afterEach(() => {
    repository.clear()
  })

  test('Property 7.1: Timeline maintains chronological order for all medical events', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        fc.array(
          fc.tuple(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length >= 20)
          ),
          { minLength: 3, maxLength: 10 }
        ).map(events => events.sort((a, b) => a[0].getTime() - b[0].getTime())), // Sort by date
        userIdGenerator(),
        async (patientId, sortedEvents, userId) => {
          // Create a medical record directly in the repository
          const record = await repository.create({
            patientId,
            diagnosis: [],
            medications: [],
            allergies: []
          })
          
          // Add progress notes in chronological order
          for (const [date, content] of sortedEvents) {
            const note = new ProgressNote(
              crypto.randomUUID(),
              content,
              new Date(),
              userId,
              date,
              'treatment'
            )
            await repository.addProgressNote(record.id, note)
          }
          
          // Get the timeline
          const timeline = await repository.getTimelineView(patientId)
          
          // Verify chronological order
          for (let i = 1; i < timeline.chronologicalEvents.length; i++) {
            const prevDate = timeline.chronologicalEvents[i - 1].date.getTime()
            const currDate = timeline.chronologicalEvents[i].date.getTime()
            
            if (prevDate > currDate) {
              console.error('Timeline not in chronological order:')
              console.error(`Event ${i - 1}: ${timeline.chronologicalEvents[i - 1].description} at ${timeline.chronologicalEvents[i - 1].date}`)
              console.error(`Event ${i}: ${timeline.chronologicalEvents[i].description} at ${timeline.chronologicalEvents[i].date}`)
              return false
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 7.2: Timeline preserves all progress notes without data loss', () => {
    // Create a simple progress note generator that ensures valid content
    const simpleProgressNoteGenerator = () => fc.tuple(
      uuidGenerator(),
      fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length >= 20),
      fc.date({ min: new Date('2020-01-01'), max: new Date() }),
      userIdGenerator(),
      fc.date({ min: new Date('2020-01-01'), max: new Date() }),
      fc.constantFrom<'assessment' | 'treatment' | 'observation' | 'goal_progress'>('assessment', 'treatment', 'observation', 'goal_progress')
    ).map(([id, content, createdAt, createdBy, sessionDate, category]) =>
      new ProgressNote(id, content, createdAt, createdBy, sessionDate, category)
    )
    
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        fc.array(simpleProgressNoteGenerator(), { minLength: 3, maxLength: 10 }),
        userIdGenerator(),
        async (patientId, progressNotes, userId) => {
          // Create a medical record directly in the repository
          const record = await repository.create({
            patientId,
            diagnosis: [],
            medications: [],
            allergies: []
          })
          
          // Add all progress notes
          for (const note of progressNotes) {
            await repository.addProgressNote(record.id, note)
          }
          
          // Get the timeline
          const timeline = await repository.getTimelineView(patientId)
          
          // Verify all progress notes are in the timeline
          const timelineProgressNotes = timeline.chronologicalEvents.filter(e => e.type === 'progress_note')
          
          if (timelineProgressNotes.length !== progressNotes.length) {
            console.error(`Expected ${progressNotes.length} progress notes, found ${timelineProgressNotes.length}`)
            return false
          }
          
          // Verify each progress note is preserved
          for (const originalNote of progressNotes) {
            const found = timelineProgressNotes.some(event => {
              const eventNote = event.details as ProgressNote
              return (
                eventNote.id === originalNote.id &&
                eventNote.content === originalNote.content &&
                eventNote.sessionDate.getTime() === originalNote.sessionDate.getTime() &&
                eventNote.category === originalNote.category
              )
            })
            
            if (!found) {
              console.error('Progress note not found in timeline:', originalNote)
              return false
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 7.3: Timeline preserves all outcomes (assessments, diagnoses) without data loss', () => {
    // Create a simple diagnosis generator that ensures valid codes
    const simpleDiagnosisGenerator = () => fc.tuple(
      fc.constantFrom('A00.0', 'B01.1', 'C02.2', 'D03.3', 'E04.4'),
      fc.string({ minLength: 10, maxLength: 100 }),
      fc.date({ min: new Date('2020-01-01'), max: new Date() })
    ).map(([code, description, diagnosedAt]) => 
      new Diagnosis(code, description, diagnosedAt, 'mild')
    )
    
    // Create a simple assessment generator that ensures valid types
    const simpleAssessmentGenerator = () => fc.tuple(
      uuidGenerator(),
      fc.constantFrom('Initial Evaluation', 'Follow-up Assessment', 'Progress Review'),
      fc.string({ minLength: 20, maxLength: 200 }),
      fc.date({ min: new Date('2020-01-01'), max: new Date() }),
      userIdGenerator()
    ).map(([id, type, summary, date, assessedBy]) =>
      new Assessment(id, type, {}, summary, ['Recommendation 1'], date, assessedBy)
    )
    
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        fc.array(simpleDiagnosisGenerator(), { minLength: 1, maxLength: 5 }),
        fc.array(simpleAssessmentGenerator(), { minLength: 1, maxLength: 5 }),
        userIdGenerator(),
        async (patientId, diagnoses, assessments, userId) => {
          // Create a medical record directly in the repository
          const record = await repository.create({
            patientId,
            diagnosis: [],
            medications: [],
            allergies: []
          })
          
          // Add all diagnoses
          for (const diagnosis of diagnoses) {
            await repository.update(record.id, {
              diagnosis: [{
                code: diagnosis.code,
                description: diagnosis.description,
                diagnosedAt: diagnosis.diagnosedAt,
                severity: diagnosis.severity
              }]
            })
          }
          
          // Add all assessments
          for (const assessment of assessments) {
            await repository.addAssessment(record.id, assessment)
          }
          
          // Get the timeline
          const timeline = await repository.getTimelineView(patientId)
          
          // Verify all diagnoses are in the timeline
          const timelineDiagnoses = timeline.chronologicalEvents.filter(e => e.type === 'diagnosis')
          if (timelineDiagnoses.length !== diagnoses.length) {
            console.error(`Expected ${diagnoses.length} diagnoses, found ${timelineDiagnoses.length}`)
            return false
          }
          
          // Verify all assessments are in the timeline
          const timelineAssessments = timeline.chronologicalEvents.filter(e => e.type === 'assessment')
          if (timelineAssessments.length !== assessments.length) {
            console.error(`Expected ${assessments.length} assessments, found ${timelineAssessments.length}`)
            return false
          }
          
          // Verify each diagnosis is preserved
          for (const originalDiagnosis of diagnoses) {
            const found = timelineDiagnoses.some(event => {
              const eventDiagnosis = event.details as Diagnosis
              return (
                eventDiagnosis.code === originalDiagnosis.code &&
                eventDiagnosis.description === originalDiagnosis.description &&
                eventDiagnosis.severity === originalDiagnosis.severity
              )
            })
            
            if (!found) {
              console.error('Diagnosis not found in timeline:', originalDiagnosis)
              return false
            }
          }
          
          // Verify each assessment is preserved
          for (const originalAssessment of assessments) {
            const found = timelineAssessments.some(event => {
              const eventAssessment = event.details as Assessment
              return (
                eventAssessment.id === originalAssessment.id &&
                eventAssessment.type === originalAssessment.type &&
                eventAssessment.summary === originalAssessment.summary
              )
            })
            
            if (!found) {
              console.error('Assessment not found in timeline:', originalAssessment)
              return false
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 7.4: Timeline maintains chronological order even when events are added out of order', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        fc.array(
          fc.tuple(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            fc.string({ minLength: 10, maxLength: 100 })
              .filter(s => s.trim().length >= 10) // Ensure non-empty after trim
          ),
          { minLength: 5, maxLength: 15 }
        ),
        userIdGenerator(),
        async (patientId, eventDates, userId) => {
          // Create a medical record directly in the repository
          const record = await repository.create({
            patientId,
            diagnosis: [],
            medications: [],
            allergies: []
          })
          
          // Shuffle the events to add them out of chronological order
          const shuffledEvents = [...eventDates].sort(() => Math.random() - 0.5)
          
          // Add events in shuffled order
          for (const [date, content] of shuffledEvents) {
            const note = new ProgressNote(
              crypto.randomUUID(),
              content,
              new Date(),
              userId,
              date,
              'treatment'
            )
            await repository.addProgressNote(record.id, note)
          }
          
          // Get the timeline
          const timeline = await repository.getTimelineView(patientId)
          
          // Verify the timeline is in chronological order despite out-of-order insertion
          for (let i = 1; i < timeline.chronologicalEvents.length; i++) {
            const prevDate = timeline.chronologicalEvents[i - 1].date.getTime()
            const currDate = timeline.chronologicalEvents[i].date.getTime()
            
            if (prevDate > currDate) {
              console.error('Timeline not in chronological order after out-of-order insertion:')
              console.error(`Event ${i - 1}: ${timeline.chronologicalEvents[i - 1].date}`)
              console.error(`Event ${i}: ${timeline.chronologicalEvents[i].date}`)
              return false
            }
          }
          
          // Verify all events are present
          if (timeline.chronologicalEvents.length !== eventDates.length) {
            console.error(`Expected ${eventDates.length} events, found ${timeline.chronologicalEvents.length}`)
            return false
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 7.5: Timeline correctly handles events with identical timestamps', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.array(
          fc.string({ minLength: 10, maxLength: 100 })
            .filter(s => s.trim().length >= 10), // Ensure non-empty after trim
          { minLength: 3, maxLength: 8 }
        ),
        userIdGenerator(),
        async (patientId, sameDate, contents, userId) => {
          // Create a medical record directly in the repository
          const record = await repository.create({
            patientId,
            diagnosis: [],
            medications: [],
            allergies: []
          })
          
          // Add multiple events with the same date
          for (const content of contents) {
            const note = new ProgressNote(
              crypto.randomUUID(),
              content,
              new Date(),
              userId,
              sameDate,
              'treatment'
            )
            await repository.addProgressNote(record.id, note)
          }
          
          // Get the timeline
          const timeline = await repository.getTimelineView(patientId)
          
          // Verify all events are present
          if (timeline.chronologicalEvents.length !== contents.length) {
            console.error(`Expected ${contents.length} events, found ${timeline.chronologicalEvents.length}`)
            return false
          }
          
          // Verify all events have the same date
          for (const event of timeline.chronologicalEvents) {
            if (event.date.getTime() !== sameDate.getTime()) {
              console.error(`Event has wrong date: expected ${sameDate}, got ${event.date}`)
              return false
            }
          }
          
          // Verify all content is preserved
          for (const content of contents) {
            const found = timeline.chronologicalEvents.some(event => {
              const note = event.details as ProgressNote
              return note.content === content
            })
            
            if (!found) {
              console.error('Content not found in timeline:', content)
              return false
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
