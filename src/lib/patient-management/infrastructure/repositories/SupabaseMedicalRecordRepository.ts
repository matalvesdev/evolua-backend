// ============================================================================
// SUPABASE MEDICAL RECORD REPOSITORY
// Supabase implementation of medical record repository
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { MedicalRecord } from '../../domain/entities/MedicalRecord'
import { MedicalRecordId } from '../../domain/value-objects/MedicalRecordId'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { Diagnosis } from '../../domain/value-objects/Diagnosis'
import { TreatmentHistory } from '../../domain/value-objects/TreatmentHistory'
import { Medication } from '../../domain/value-objects/Medication'
import { Allergy } from '../../domain/value-objects/Allergy'
import { ProgressNote } from '../../domain/value-objects/ProgressNote'
import { Assessment } from '../../domain/value-objects/Assessment'
import { 
  IMedicalRecordRepository, 
  CreateMedicalRecordRequest, 
  UpdateMedicalRecordRequest,
  TreatmentTimeline,
  ChronologicalEvent
} from './IMedicalRecordRepository'

interface MedicalRecordRow {
  id: string
  patient_id: string
  diagnosis: any[]
  treatment_history: any[]
  medications: any[]
  allergies: any[]
  created_at: string
  updated_at: string
}

interface ProgressNoteRow {
  id: string
  medical_record_id: string
  content: string
  created_by: string
  session_date: string
  category: string
  created_at: string
}

interface AssessmentRow {
  id: string
  medical_record_id: string
  type: string
  results: Record<string, any>
  summary: string
  recommendations: string[]
  assessed_by: string
  date: string
  created_at: string
}

export class SupabaseMedicalRecordRepository implements IMedicalRecordRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(request: CreateMedicalRecordRequest): Promise<MedicalRecord> {
    const id = MedicalRecordId.generate()
    const now = new Date()

    // Convert request data to domain objects
    const diagnosis = request.diagnosis?.map(d => new Diagnosis(
      d.code,
      d.description,
      d.diagnosedAt,
      d.severity
    )) || []

    const medications = request.medications?.map(m => new Medication(
      m.name,
      m.dosage,
      m.frequency,
      m.startDate,
      m.endDate || null,
      m.prescribedBy,
      null // notes
    )) || []

    const allergies = request.allergies?.map(a => new Allergy(
      a.allergen,
      a.reaction,
      a.severity,
      a.discoveredAt,
      null // notes
    )) || []

    // Insert medical record
    const { data: recordData, error: recordError } = await this.supabase
      .from('medical_records')
      .insert({
        id: id.value,
        patient_id: request.patientId.value,
        diagnosis: diagnosis.map(d => ({
          code: d.code,
          description: d.description,
          diagnosedAt: d.diagnosedAt.toISOString(),
          severity: d.severity
        })),
        treatment_history: [],
        medications: medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          startDate: m.startDate.toISOString(),
          endDate: m.endDate?.toISOString(),
          prescribedBy: m.prescribedBy
        })),
        allergies: allergies.map(a => ({
          allergen: a.allergen,
          reaction: a.reaction,
          severity: a.severity,
          diagnosedAt: a.diagnosedAt.toISOString()
        })),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .select()
      .single()

    if (recordError) {
      throw new Error(`Failed to create medical record: ${recordError.message}`)
    }

    // Add initial assessment if provided
    let assessments: Assessment[] = []
    if (request.initialAssessment) {
      const assessment = new Assessment(
        crypto.randomUUID(),
        'Initial Assessment',
        {},
        request.initialAssessment.findings,
        [request.initialAssessment.recommendations],
        request.initialAssessment.date,
        new UserId(request.initialAssessment.assessedBy)
      )

      const { error: assessmentError } = await this.supabase
        .from('medical_record_assessments')
        .insert({
          id: assessment.id,
          medical_record_id: id.value,
          type: assessment.type,
          results: assessment.results,
          summary: assessment.summary,
          recommendations: assessment.recommendations,
          assessed_by: assessment.assessedBy.value,
          date: assessment.date.toISOString(),
          created_at: now.toISOString()
        })

      if (assessmentError) {
        throw new Error(`Failed to create initial assessment: ${assessmentError.message}`)
      }

      assessments = [assessment]
    }

    return new MedicalRecord(
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
  }

  async update(id: MedicalRecordId, request: UpdateMedicalRecordRequest): Promise<MedicalRecord> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Medical record with ID ${id.value} not found`)
    }

    const now = new Date()
    const updateData: any = {
      updated_at: now.toISOString()
    }

    if (request.diagnosis) {
      updateData.diagnosis = request.diagnosis.map(d => ({
        code: d.code,
        description: d.description,
        diagnosedAt: d.diagnosedAt.toISOString(),
        severity: d.severity
      }))
    }

    if (request.medications) {
      updateData.medications = request.medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate?.toISOString(),
        prescribedBy: m.prescribedBy
      }))
    }

    if (request.allergies) {
      updateData.allergies = request.allergies.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        diagnosedAt: a.diagnosedAt.toISOString()
      }))
    }

    const { data, error } = await this.supabase
      .from('medical_records')
      .update(updateData)
      .eq('id', id.value)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update medical record: ${error.message}`)
    }

    return await this.findById(id) as MedicalRecord
  }

  async findById(id: MedicalRecordId): Promise<MedicalRecord | null> {
    const { data: recordData, error: recordError } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('id', id.value)
      .single()

    if (recordError) {
      if (recordError.code === 'PGRST116') {
        return null // Record not found
      }
      throw new Error(`Failed to find medical record: ${recordError.message}`)
    }

    // Get progress notes
    const { data: notesData, error: notesError } = await this.supabase
      .from('medical_record_progress_notes')
      .select('*')
      .eq('medical_record_id', id.value)
      .order('session_date', { ascending: true })

    if (notesError) {
      throw new Error(`Failed to fetch progress notes: ${notesError.message}`)
    }

    // Get assessments
    const { data: assessmentsData, error: assessmentsError } = await this.supabase
      .from('medical_record_assessments')
      .select('*')
      .eq('medical_record_id', id.value)
      .order('date', { ascending: true })

    if (assessmentsError) {
      throw new Error(`Failed to fetch assessments: ${assessmentsError.message}`)
    }

    return this.mapToMedicalRecord(recordData, notesData || [], assessmentsData || [])
  }

  async findByPatientId(patientId: PatientId): Promise<MedicalRecord[]> {
    const { data: recordsData, error: recordsError } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId.value)
      .order('created_at', { ascending: false })

    if (recordsError) {
      throw new Error(`Failed to find medical records: ${recordsError.message}`)
    }

    if (!recordsData || recordsData.length === 0) {
      return []
    }

    const recordIds = recordsData.map(r => r.id)

    // Get all progress notes for these records
    const { data: notesData, error: notesError } = await this.supabase
      .from('medical_record_progress_notes')
      .select('*')
      .in('medical_record_id', recordIds)
      .order('session_date', { ascending: true })

    if (notesError) {
      throw new Error(`Failed to fetch progress notes: ${notesError.message}`)
    }

    // Get all assessments for these records
    const { data: assessmentsData, error: assessmentsError } = await this.supabase
      .from('medical_record_assessments')
      .select('*')
      .in('medical_record_id', recordIds)
      .order('date', { ascending: true })

    if (assessmentsError) {
      throw new Error(`Failed to fetch assessments: ${assessmentsError.message}`)
    }

    // Group notes and assessments by record ID
    const notesByRecord = (notesData || []).reduce((acc, note) => {
      if (!acc[note.medical_record_id]) acc[note.medical_record_id] = []
      acc[note.medical_record_id].push(note)
      return acc
    }, {} as Record<string, any[]>)

    const assessmentsByRecord = (assessmentsData || []).reduce((acc, assessment) => {
      if (!acc[assessment.medical_record_id]) acc[assessment.medical_record_id] = []
      acc[assessment.medical_record_id].push(assessment)
      return acc
    }, {} as Record<string, any[]>)

    return recordsData.map(record => 
      this.mapToMedicalRecord(
        record,
        notesByRecord[record.id] || [],
        assessmentsByRecord[record.id] || []
      )
    )
  }

  async addProgressNote(recordId: MedicalRecordId, note: ProgressNote): Promise<void> {
    const { error } = await this.supabase
      .from('medical_record_progress_notes')
      .insert({
        id: crypto.randomUUID(),
        medical_record_id: recordId.value,
        content: note.content,
        created_by: note.createdBy.value,
        session_date: note.sessionDate.toISOString(),
        category: note.category,
        created_at: note.createdAt.toISOString()
      })

    if (error) {
      throw new Error(`Failed to add progress note: ${error.message}`)
    }
  }

  async addAssessment(recordId: MedicalRecordId, assessment: Assessment): Promise<void> {
    const { error } = await this.supabase
      .from('medical_record_assessments')
      .insert({
        id: crypto.randomUUID(),
        medical_record_id: recordId.value,
        type: assessment.type,
        results: assessment.results,
        summary: assessment.summary,
        recommendations: assessment.recommendations,
        assessed_by: assessment.assessedBy.value,
        date: assessment.date.toISOString(),
        created_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to add assessment: ${error.message}`)
    }
  }

  async getTimelineView(patientId: PatientId): Promise<TreatmentTimeline> {
    const records = await this.findByPatientId(patientId)
    const chronologicalEvents: ChronologicalEvent[] = []

    // Collect all events from all records
    for (const record of records) {
      // Add diagnosis events
      record.diagnosis.forEach(diagnosis => {
        chronologicalEvents.push({
          date: diagnosis.diagnosedAt,
          type: 'diagnosis',
          description: `Diagnosed: ${diagnosis.description}`,
          recordId: record.id,
          details: diagnosis
        })
      })

      // Add treatment events
      record.treatmentHistory.forEach(treatment => {
        chronologicalEvents.push({
          date: treatment.startDate,
          type: 'treatment',
          description: `Treatment started: ${treatment.description}`,
          recordId: record.id,
          details: treatment
        })
      })

      // Add progress note events
      record.progressNotes.forEach(note => {
        chronologicalEvents.push({
          date: note.sessionDate,
          type: 'progress_note',
          description: `Progress note: ${note.content.substring(0, 100)}...`,
          recordId: record.id,
          details: note
        })
      })

      // Add assessment events
      record.assessments.forEach(assessment => {
        chronologicalEvents.push({
          date: assessment.date,
          type: 'assessment',
          description: `Assessment: ${assessment.summary.substring(0, 100)}...`,
          recordId: record.id,
          details: assessment
        })
      })

      // Add medication events
      record.medications.forEach(medication => {
        chronologicalEvents.push({
          date: medication.startDate,
          type: 'medication',
          description: `Medication started: ${medication.name}`,
          recordId: record.id,
          details: medication
        })
      })

      // Add allergy events
      record.allergies.forEach(allergy => {
        chronologicalEvents.push({
          date: allergy.discoveredAt,
          type: 'allergy',
          description: `Allergy discovered: ${allergy.allergen}`,
          recordId: record.id,
          details: allergy
        })
      })
    }

    // Sort events chronologically
    chronologicalEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

    return {
      patientId,
      records,
      chronologicalEvents
    }
  }

  async delete(id: MedicalRecordId): Promise<void> {
    // Soft delete by updating a deleted_at timestamp
    const { error } = await this.supabase
      .from('medical_records')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id.value)

    if (error) {
      throw new Error(`Failed to delete medical record: ${error.message}`)
    }
  }

  async exists(id: MedicalRecordId): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('medical_records')
      .select('id')
      .eq('id', id.value)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return false // Record not found
      }
      throw new Error(`Failed to check medical record existence: ${error.message}`)
    }

    return !!data
  }

  private mapToMedicalRecord(
    recordData: MedicalRecordRow,
    notesData: ProgressNoteRow[],
    assessmentsData: AssessmentRow[]
  ): MedicalRecord {
    // Map diagnosis
    const diagnosis = (recordData.diagnosis || []).map((d: any) => 
      new Diagnosis(d.code, d.description, new Date(d.diagnosedAt), d.severity)
    )

    // Map treatment history
    const treatmentHistory = (recordData.treatment_history || []).map((t: any) => 
      new TreatmentHistory(
        t.id,
        t.description,
        new Date(t.startDate),
        t.endDate ? new Date(t.endDate) : null,
        t.goals || [],
        new Date(t.createdAt)
      )
    )

    // Map medications
    const medications = (recordData.medications || []).map((m: any) => 
      new Medication(
        m.name,
        m.dosage,
        m.frequency,
        new Date(m.startDate),
        m.endDate ? new Date(m.endDate) : null,
        m.prescribedBy,
        m.notes || null
      )
    )

    // Map allergies
    const allergies = (recordData.allergies || []).map((a: any) => 
      new Allergy(a.allergen, a.reaction, a.severity, new Date(a.diagnosedAt), a.notes || null)
    )

    // Map progress notes
    const progressNotes = notesData.map(note => 
      new ProgressNote(
        note.id,
        note.content,
        new Date(note.created_at),
        new UserId(note.created_by),
        new Date(note.session_date),
        note.category as 'assessment' | 'treatment' | 'observation' | 'goal_progress'
      )
    )

    // Map assessments
    const assessments = assessmentsData.map(assessment => 
      new Assessment(
        assessment.id,
        assessment.type,
        assessment.results,
        assessment.summary,
        assessment.recommendations,
        new Date(assessment.date),
        new UserId(assessment.assessed_by)
      )
    )

    return new MedicalRecord(
      new MedicalRecordId(recordData.id),
      new PatientId(recordData.patient_id),
      diagnosis,
      treatmentHistory,
      medications,
      allergies,
      progressNotes,
      assessments,
      new Date(recordData.created_at),
      new Date(recordData.updated_at)
    )
  }
}