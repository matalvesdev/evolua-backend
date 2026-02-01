// ============================================================================
// MEDICAL RECORD REPOSITORY INTERFACE
// Repository interface for medical record persistence operations
// ============================================================================

import { MedicalRecord } from '../../domain/entities/MedicalRecord'
import { MedicalRecordId } from '../../domain/value-objects/MedicalRecordId'
import { PatientId } from '../../domain/value-objects/PatientId'
import { ProgressNote } from '../../domain/value-objects/ProgressNote'
import { Assessment } from '../../domain/value-objects/Assessment'

export interface TreatmentTimeline {
  patientId: PatientId
  records: MedicalRecord[]
  chronologicalEvents: ChronologicalEvent[]
}

export interface ChronologicalEvent {
  date: Date
  type: 'diagnosis' | 'treatment' | 'progress_note' | 'assessment' | 'medication' | 'allergy'
  description: string
  recordId: MedicalRecordId
  details: any
}

export interface CreateMedicalRecordRequest {
  patientId: PatientId
  diagnosis?: Array<{
    code: string
    description: string
    diagnosedAt: Date
    severity: 'mild' | 'moderate' | 'severe' | 'unknown'
  }>
  medications?: Array<{
    name: string
    dosage: string
    frequency: string
    startDate: Date
    endDate?: Date
    prescribedBy: string
  }>
  allergies?: Array<{
    allergen: string
    reaction: string
    severity: 'mild' | 'moderate' | 'severe'
    diagnosedAt: Date
  }>
  initialAssessment?: {
    findings: string
    recommendations: string
    assessedBy: string // This should be a UUID string
    date: Date
  }
}

export interface UpdateMedicalRecordRequest {
  diagnosis?: Array<{
    code: string
    description: string
    diagnosedAt: Date
    severity: 'mild' | 'moderate' | 'severe' | 'unknown'
  }>
  medications?: Array<{
    name: string
    dosage: string
    frequency: string
    startDate: Date
    endDate?: Date
    prescribedBy: string
  }>
  allergies?: Array<{
    allergen: string
    reaction: string
    severity: 'mild' | 'moderate' | 'severe'
    diagnosedAt: Date
  }>
}

export interface IMedicalRecordRepository {
  /**
   * Create a new medical record for a patient
   */
  create(request: CreateMedicalRecordRequest): Promise<MedicalRecord>

  /**
   * Update an existing medical record
   */
  update(id: MedicalRecordId, request: UpdateMedicalRecordRequest): Promise<MedicalRecord>

  /**
   * Find a medical record by ID
   */
  findById(id: MedicalRecordId): Promise<MedicalRecord | null>

  /**
   * Get all medical records for a patient
   */
  findByPatientId(patientId: PatientId): Promise<MedicalRecord[]>

  /**
   * Add a progress note to a medical record
   */
  addProgressNote(recordId: MedicalRecordId, note: ProgressNote): Promise<void>

  /**
   * Add an assessment to a medical record
   */
  addAssessment(recordId: MedicalRecordId, assessment: Assessment): Promise<void>

  /**
   * Get chronological treatment timeline for a patient
   * Returns all medical events in chronological order
   */
  getTimelineView(patientId: PatientId): Promise<TreatmentTimeline>

  /**
   * Delete a medical record (soft delete for audit purposes)
   */
  delete(id: MedicalRecordId): Promise<void>

  /**
   * Check if a medical record exists
   */
  exists(id: MedicalRecordId): Promise<boolean>
}