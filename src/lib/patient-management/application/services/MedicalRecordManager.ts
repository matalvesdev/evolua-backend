// ============================================================================
// MEDICAL RECORD MANAGER SERVICE
// Service layer for medical record operations with clinical data validation
// ============================================================================

import { MedicalRecord } from '../../domain/entities/MedicalRecord'
import { MedicalRecordId } from '../../domain/value-objects/MedicalRecordId'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { Diagnosis } from '../../domain/value-objects/Diagnosis'
import { Medication } from '../../domain/value-objects/Medication'
import { Allergy } from '../../domain/value-objects/Allergy'
import { ProgressNote } from '../../domain/value-objects/ProgressNote'
import { Assessment } from '../../domain/value-objects/Assessment'
import { TreatmentPlan } from '../../domain/value-objects/TreatmentPlan'
import { 
  IMedicalRecordRepository, 
  CreateMedicalRecordRequest, 
  UpdateMedicalRecordRequest,
  TreatmentTimeline
} from '../../infrastructure/repositories/IMedicalRecordRepository'

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface MedicalRecordData {
  diagnosis?: DiagnosisData[]
  medications?: MedicationData[]
  allergies?: AllergyData[]
  initialAssessment?: AssessmentData
}

export interface DiagnosisData {
  code: string
  description: string
  diagnosedAt: Date
  severity: 'mild' | 'moderate' | 'severe' | 'unknown'
}

export interface MedicationData {
  name: string
  dosage: string
  frequency: string
  startDate: Date
  endDate?: Date
  prescribedBy: string
  notes?: string
}

export interface AllergyData {
  allergen: string
  reaction: string
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening'
  diagnosedAt: Date
  notes?: string
}

export interface AssessmentData {
  type: string
  findings: string
  recommendations: string[]
  assessedBy: string
  date: Date
  results?: Record<string, any>
}

export interface ProgressNoteData {
  content: string
  sessionDate: Date
  category: 'assessment' | 'treatment' | 'observation' | 'goal_progress'
  createdBy: string
}

export interface MedicalRecordUpdate {
  diagnosis?: DiagnosisData[]
  medications?: MedicationData[]
  allergies?: AllergyData[]
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

export interface ClinicalDataIntegrityCheck {
  patientId: PatientId
  recordId: MedicalRecordId
  checks: IntegrityCheckResult[]
  overallStatus: 'passed' | 'failed' | 'warning'
  timestamp: Date
}

export interface IntegrityCheckResult {
  checkType: 'medication_interaction' | 'allergy_conflict' | 'diagnosis_consistency' | 'treatment_timeline'
  status: 'passed' | 'failed' | 'warning'
  message: string
  details?: any
}

export type MedicalRecordManagerError = 
  | 'MEDICAL_RECORD_NOT_FOUND'
  | 'PATIENT_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'INTEGRITY_CHECK_FAILED'
  | 'UNAUTHORIZED_ACCESS'
  | 'CLINICAL_DATA_INVALID'

// ============================================================================
// MEDICAL RECORD MANAGER SERVICE
// ============================================================================

export class MedicalRecordManager {
  constructor(
    private medicalRecordRepository: IMedicalRecordRepository
  ) {}

  /**
   * Create a new medical record with comprehensive validation
   */
  async createMedicalRecord(
    patientId: PatientId, 
    recordData: MedicalRecordData,
    createdBy: UserId
  ): Promise<MedicalRecord> {
    // Validate clinical data
    const validation = await this.validateClinicalData(recordData)
    if (!validation.isValid) {
      throw new Error(`Clinical data validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Convert to repository request format
    const request: CreateMedicalRecordRequest = {
      patientId,
      diagnosis: recordData.diagnosis?.map(d => ({
        code: d.code,
        description: d.description,
        diagnosedAt: d.diagnosedAt,
        severity: d.severity
      })),
      medications: recordData.medications?.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.startDate,
        endDate: m.endDate,
        prescribedBy: m.prescribedBy
      })),
      allergies: recordData.allergies?.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        diagnosedAt: a.diagnosedAt
      })),
      initialAssessment: recordData.initialAssessment ? {
        findings: recordData.initialAssessment.findings,
        recommendations: recordData.initialAssessment.recommendations.join('; '),
        assessedBy: recordData.initialAssessment.assessedBy,
        date: recordData.initialAssessment.date
      } : undefined
    }

    const medicalRecord = await this.medicalRecordRepository.create(request)

    // Perform integrity checks after creation
    await this.performIntegrityChecks(medicalRecord)

    return medicalRecord
  }

  /**
   * Update an existing medical record with validation
   */
  async updateMedicalRecord(
    recordId: MedicalRecordId,
    updates: MedicalRecordUpdate,
    updatedBy: UserId
  ): Promise<MedicalRecord> {
    // Check if record exists
    const existingRecord = await this.medicalRecordRepository.findById(recordId)
    if (!existingRecord) {
      throw new Error(`Medical record with ID ${recordId.value} not found`)
    }

    // Validate clinical data updates
    const validation = await this.validateClinicalData(updates)
    if (!validation.isValid) {
      throw new Error(`Clinical data validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Convert to repository request format
    const request: UpdateMedicalRecordRequest = {
      diagnosis: updates.diagnosis?.map(d => ({
        code: d.code,
        description: d.description,
        diagnosedAt: d.diagnosedAt,
        severity: d.severity
      })),
      medications: updates.medications?.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.startDate,
        endDate: m.endDate,
        prescribedBy: m.prescribedBy
      })),
      allergies: updates.allergies?.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        diagnosedAt: a.diagnosedAt
      }))
    }

    const updatedRecord = await this.medicalRecordRepository.update(recordId, request)

    // Perform integrity checks after update
    await this.performIntegrityChecks(updatedRecord)

    return updatedRecord
  }

  /**
   * Get medical record by ID
   */
  async getMedicalRecord(recordId: MedicalRecordId): Promise<MedicalRecord | null> {
    return await this.medicalRecordRepository.findById(recordId)
  }

  /**
   * Get all medical records for a patient
   */
  async getMedicalHistory(patientId: PatientId): Promise<MedicalRecord[]> {
    return await this.medicalRecordRepository.findByPatientId(patientId)
  }

  /**
   * Add a progress note to a medical record
   */
  async addProgressNote(
    recordId: MedicalRecordId,
    noteData: ProgressNoteData
  ): Promise<void> {
    // Validate progress note data
    this.validateProgressNote(noteData)

    const progressNote = new ProgressNote(
      crypto.randomUUID(),
      noteData.content,
      new Date(),
      new UserId(noteData.createdBy),
      noteData.sessionDate,
      noteData.category
    )

    await this.medicalRecordRepository.addProgressNote(recordId, progressNote)
  }

  /**
   * Add an assessment to a medical record
   */
  async addAssessment(
    recordId: MedicalRecordId,
    assessmentData: AssessmentData
  ): Promise<void> {
    // Validate assessment data
    this.validateAssessment(assessmentData)

    const assessment = new Assessment(
      crypto.randomUUID(),
      assessmentData.type,
      assessmentData.results || {},
      assessmentData.findings,
      assessmentData.recommendations,
      assessmentData.date,
      new UserId(assessmentData.assessedBy)
    )

    await this.medicalRecordRepository.addAssessment(recordId, assessment)
  }

  /**
   * Generate treatment timeline for a patient
   */
  async getTimelineView(patientId: PatientId): Promise<TreatmentTimeline> {
    const timeline = await this.medicalRecordRepository.getTimelineView(patientId)
    
    // Validate timeline integrity
    this.validateTimelineIntegrity(timeline)
    
    return timeline
  }

  /**
   * Update treatment plan for a medical record
   */
  async updateTreatmentPlan(
    recordId: MedicalRecordId,
    treatmentPlan: TreatmentPlan,
    updatedBy: UserId
  ): Promise<MedicalRecord> {
    const existingRecord = await this.medicalRecordRepository.findById(recordId)
    if (!existingRecord) {
      throw new Error(`Medical record with ID ${recordId.value} not found`)
    }

    // Validate treatment plan
    this.validateTreatmentPlan(treatmentPlan)

    // Update the record with the new treatment plan
    const updatedRecord = existingRecord.updateTreatmentPlan(treatmentPlan)
    
    // This would typically involve updating the repository
    // For now, we'll return the updated record
    return updatedRecord
  }

  /**
   * Perform comprehensive clinical data integrity checks
   */
  async performIntegrityChecks(medicalRecord: MedicalRecord): Promise<ClinicalDataIntegrityCheck> {
    const checks: IntegrityCheckResult[] = []

    // Check for medication interactions
    const medicationCheck = this.checkMedicationInteractions(medicalRecord.medications)
    checks.push(medicationCheck)

    // Check for allergy conflicts with medications
    const allergyCheck = this.checkAllergyConflicts(medicalRecord.medications, medicalRecord.allergies)
    checks.push(allergyCheck)

    // Check diagnosis consistency
    const diagnosisCheck = this.checkDiagnosisConsistency(medicalRecord.diagnosis)
    checks.push(diagnosisCheck)

    // Check treatment timeline consistency
    const timelineCheck = this.checkTreatmentTimelineConsistency(medicalRecord)
    checks.push(timelineCheck)

    // Determine overall status
    const hasFailures = checks.some(check => check.status === 'failed')
    const hasWarnings = checks.some(check => check.status === 'warning')
    const overallStatus = hasFailures ? 'failed' : hasWarnings ? 'warning' : 'passed'

    const integrityCheck: ClinicalDataIntegrityCheck = {
      patientId: medicalRecord.patientId,
      recordId: medicalRecord.id,
      checks,
      overallStatus,
      timestamp: new Date()
    }

    // Log integrity check results
    if (overallStatus === 'failed') {
      console.error('Medical record integrity check failed:', integrityCheck)
    } else if (overallStatus === 'warning') {
      console.warn('Medical record integrity check has warnings:', integrityCheck)
    }

    return integrityCheck
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  private async validateClinicalData(data: MedicalRecordData | MedicalRecordUpdate): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate diagnosis data
    if (data.diagnosis) {
      for (const diagnosis of data.diagnosis) {
        if (!diagnosis.code || diagnosis.code.trim().length === 0) {
          errors.push({
            field: 'diagnosis.code',
            message: 'Diagnosis code is required',
            code: 'DIAGNOSIS_CODE_REQUIRED'
          })
        }

        if (!diagnosis.description || diagnosis.description.trim().length === 0) {
          errors.push({
            field: 'diagnosis.description',
            message: 'Diagnosis description is required',
            code: 'DIAGNOSIS_DESCRIPTION_REQUIRED'
          })
        }

        if (diagnosis.diagnosedAt > new Date()) {
          errors.push({
            field: 'diagnosis.diagnosedAt',
            message: 'Diagnosis date cannot be in the future',
            code: 'DIAGNOSIS_DATE_FUTURE'
          })
        }

        // Validate diagnosis code format (basic ICD-10 format check)
        if (diagnosis.code && !this.isValidDiagnosisCode(diagnosis.code)) {
          warnings.push({
            field: 'diagnosis.code',
            message: 'Diagnosis code format may not be valid ICD-10',
            code: 'DIAGNOSIS_CODE_FORMAT'
          })
        }
      }
    }

    // Validate medication data
    if (data.medications) {
      for (const medication of data.medications) {
        if (!medication.name || medication.name.trim().length === 0) {
          errors.push({
            field: 'medication.name',
            message: 'Medication name is required',
            code: 'MEDICATION_NAME_REQUIRED'
          })
        }

        if (!medication.dosage || medication.dosage.trim().length === 0) {
          errors.push({
            field: 'medication.dosage',
            message: 'Medication dosage is required',
            code: 'MEDICATION_DOSAGE_REQUIRED'
          })
        }

        if (!medication.frequency || medication.frequency.trim().length === 0) {
          errors.push({
            field: 'medication.frequency',
            message: 'Medication frequency is required',
            code: 'MEDICATION_FREQUENCY_REQUIRED'
          })
        }

        if (!medication.prescribedBy || medication.prescribedBy.trim().length === 0) {
          errors.push({
            field: 'medication.prescribedBy',
            message: 'Prescribing doctor is required',
            code: 'MEDICATION_PRESCRIBER_REQUIRED'
          })
        }

        if (medication.startDate > new Date()) {
          errors.push({
            field: 'medication.startDate',
            message: 'Medication start date cannot be in the future',
            code: 'MEDICATION_START_DATE_FUTURE'
          })
        }

        if (medication.endDate && medication.endDate < medication.startDate) {
          errors.push({
            field: 'medication.endDate',
            message: 'Medication end date cannot be before start date',
            code: 'MEDICATION_END_DATE_INVALID'
          })
        }
      }
    }

    // Validate allergy data
    if (data.allergies) {
      for (const allergy of data.allergies) {
        if (!allergy.allergen || allergy.allergen.trim().length === 0) {
          errors.push({
            field: 'allergy.allergen',
            message: 'Allergen is required',
            code: 'ALLERGY_ALLERGEN_REQUIRED'
          })
        }

        if (!allergy.reaction || allergy.reaction.trim().length === 0) {
          errors.push({
            field: 'allergy.reaction',
            message: 'Allergic reaction is required',
            code: 'ALLERGY_REACTION_REQUIRED'
          })
        }

        if (allergy.diagnosedAt > new Date()) {
          errors.push({
            field: 'allergy.diagnosedAt',
            message: 'Allergy diagnosis date cannot be in the future',
            code: 'ALLERGY_DATE_FUTURE'
          })
        }

        const validSeverities = ['mild', 'moderate', 'severe', 'life_threatening']
        if (!validSeverities.includes(allergy.severity)) {
          errors.push({
            field: 'allergy.severity',
            message: 'Invalid allergy severity',
            code: 'ALLERGY_SEVERITY_INVALID'
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private validateProgressNote(noteData: ProgressNoteData): void {
    if (!noteData.content || noteData.content.trim().length === 0) {
      throw new Error('Progress note content is required')
    }

    if (noteData.content.length > 2000) {
      throw new Error('Progress note content cannot exceed 2000 characters')
    }

    if (!noteData.createdBy || noteData.createdBy.trim().length === 0) {
      throw new Error('Progress note creator is required')
    }

    if (noteData.sessionDate > new Date()) {
      throw new Error('Progress note session date cannot be in the future')
    }

    const validCategories = ['assessment', 'treatment', 'observation', 'goal_progress']
    if (!validCategories.includes(noteData.category)) {
      throw new Error('Invalid progress note category')
    }
  }

  private validateAssessment(assessmentData: AssessmentData): void {
    if (!assessmentData.type || assessmentData.type.trim().length === 0) {
      throw new Error('Assessment type is required')
    }

    if (!assessmentData.findings || assessmentData.findings.trim().length === 0) {
      throw new Error('Assessment findings are required')
    }

    if (!assessmentData.recommendations || assessmentData.recommendations.length === 0) {
      throw new Error('Assessment recommendations are required')
    }

    if (!assessmentData.assessedBy || assessmentData.assessedBy.trim().length === 0) {
      throw new Error('Assessment assessor is required')
    }

    if (assessmentData.date > new Date()) {
      throw new Error('Assessment date cannot be in the future')
    }

    if (assessmentData.findings.length > 2000) {
      throw new Error('Assessment findings cannot exceed 2000 characters')
    }
  }

  private validateTreatmentPlan(treatmentPlan: TreatmentPlan): void {
    if (!treatmentPlan.description || treatmentPlan.description.trim().length === 0) {
      throw new Error('Treatment plan description is required')
    }

    if (treatmentPlan.startDate > new Date()) {
      throw new Error('Treatment plan start date cannot be in the future')
    }

    if (treatmentPlan.endDate && treatmentPlan.endDate < treatmentPlan.startDate) {
      throw new Error('Treatment plan end date cannot be before start date')
    }

    if (treatmentPlan.goals.length === 0) {
      throw new Error('Treatment plan must have at least one goal')
    }
  }

  private validateTimelineIntegrity(timeline: TreatmentTimeline): void {
    // Check that events are in chronological order
    for (let i = 1; i < timeline.chronologicalEvents.length; i++) {
      const currentEvent = timeline.chronologicalEvents[i]
      const previousEvent = timeline.chronologicalEvents[i - 1]
      
      if (currentEvent.date < previousEvent.date) {
        throw new Error('Treatment timeline events are not in chronological order')
      }
    }

    // Check that all events reference valid records
    const recordIds = new Set(timeline.records.map(r => r.id.value))
    for (const event of timeline.chronologicalEvents) {
      if (!recordIds.has(event.recordId.value)) {
        throw new Error(`Timeline event references non-existent record: ${event.recordId.value}`)
      }
    }
  }

  private isValidDiagnosisCode(code: string): boolean {
    // Basic ICD-10 format validation (letter followed by 2-3 digits, optional decimal and more digits)
    const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,2})?$/
    return icd10Pattern.test(code)
  }

  // ============================================================================
  // INTEGRITY CHECK METHODS
  // ============================================================================

  private checkMedicationInteractions(medications: readonly Medication[]): IntegrityCheckResult {
    // Simplified medication interaction check
    // In a real system, this would use a comprehensive drug interaction database
    const activeMedications = medications.filter(med => med.isActive())
    
    if (activeMedications.length <= 1) {
      return {
        checkType: 'medication_interaction',
        status: 'passed',
        message: 'No medication interactions detected'
      }
    }

    // Basic check for common problematic combinations
    const medicationNames = activeMedications.map(med => med.name.toLowerCase())
    const hasWarfarin = medicationNames.some(name => name.includes('warfarin'))
    const hasAspirin = medicationNames.some(name => name.includes('aspirin') || name.includes('ácido acetilsalicílico'))

    if (hasWarfarin && hasAspirin) {
      return {
        checkType: 'medication_interaction',
        status: 'warning',
        message: 'Potential interaction between warfarin and aspirin - increased bleeding risk',
        details: { medications: ['warfarin', 'aspirin'] }
      }
    }

    return {
      checkType: 'medication_interaction',
      status: 'passed',
      message: 'No significant medication interactions detected'
    }
  }

  private checkAllergyConflicts(
    medications: readonly Medication[], 
    allergies: readonly Allergy[]
  ): IntegrityCheckResult {
    const activeMedications = medications.filter(med => med.isActive())
    
    for (const allergy of allergies) {
      for (const medication of activeMedications) {
        // Check if medication name contains allergen
        if (medication.name.toLowerCase().includes(allergy.allergen.toLowerCase())) {
          return {
            checkType: 'allergy_conflict',
            status: 'failed',
            message: `Medication ${medication.name} may conflict with allergy to ${allergy.allergen}`,
            details: { medication: medication.name, allergen: allergy.allergen }
          }
        }
      }
    }

    return {
      checkType: 'allergy_conflict',
      status: 'passed',
      message: 'No allergy conflicts with current medications'
    }
  }

  private checkDiagnosisConsistency(diagnosis: readonly Diagnosis[]): IntegrityCheckResult {
    if (diagnosis.length === 0) {
      return {
        checkType: 'diagnosis_consistency',
        status: 'warning',
        message: 'No diagnosis recorded'
      }
    }

    // Check for duplicate diagnosis codes
    const diagnosisCodes = diagnosis.map(d => d.code)
    const uniqueCodes = new Set(diagnosisCodes)
    
    if (diagnosisCodes.length !== uniqueCodes.size) {
      return {
        checkType: 'diagnosis_consistency',
        status: 'warning',
        message: 'Duplicate diagnosis codes detected',
        details: { duplicates: diagnosisCodes.filter((code, index) => diagnosisCodes.indexOf(code) !== index) }
      }
    }

    return {
      checkType: 'diagnosis_consistency',
      status: 'passed',
      message: 'Diagnosis data is consistent'
    }
  }

  private checkTreatmentTimelineConsistency(medicalRecord: MedicalRecord): IntegrityCheckResult {
    const treatmentHistory = medicalRecord.treatmentHistory
    
    if (treatmentHistory.length === 0) {
      return {
        checkType: 'treatment_timeline',
        status: 'passed',
        message: 'No treatment history to validate'
      }
    }

    // Check for overlapping treatments
    for (let i = 0; i < treatmentHistory.length - 1; i++) {
      const current = treatmentHistory[i]
      const next = treatmentHistory[i + 1]
      
      if (current.endDate && next.startDate < current.endDate) {
        return {
          checkType: 'treatment_timeline',
          status: 'warning',
          message: 'Overlapping treatment periods detected',
          details: { 
            treatment1: current.description, 
            treatment2: next.description 
          }
        }
      }
    }

    return {
      checkType: 'treatment_timeline',
      status: 'passed',
      message: 'Treatment timeline is consistent'
    }
  }
}