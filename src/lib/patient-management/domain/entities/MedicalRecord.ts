// ============================================================================
// MEDICAL RECORD ENTITY
// Represents comprehensive medical history and clinical data
// ============================================================================

import { MedicalRecordId } from '../value-objects/MedicalRecordId'
import { PatientId } from '../value-objects/PatientId'
import { Diagnosis } from '../value-objects/Diagnosis'
import { TreatmentHistory } from '../value-objects/TreatmentHistory'
import { Medication } from '../value-objects/Medication'
import { Allergy } from '../value-objects/Allergy'
import { ProgressNote } from '../value-objects/ProgressNote'
import { Assessment } from '../value-objects/Assessment'
import { TreatmentPlan } from '../value-objects/TreatmentPlan'

export class MedicalRecord {
  constructor(
    public readonly id: MedicalRecordId,
    public readonly patientId: PatientId,
    private _diagnosis: Diagnosis[],
    private _treatmentHistory: TreatmentHistory[],
    private _medications: Medication[],
    private _allergies: Allergy[],
    private _progressNotes: ProgressNote[],
    private _assessments: Assessment[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  get diagnosis(): readonly Diagnosis[] {
    return [...this._diagnosis]
  }

  get treatmentHistory(): readonly TreatmentHistory[] {
    return [...this._treatmentHistory]
  }

  get medications(): readonly Medication[] {
    return [...this._medications]
  }

  get allergies(): readonly Allergy[] {
    return [...this._allergies]
  }

  get progressNotes(): readonly ProgressNote[] {
    return [...this._progressNotes]
  }

  get assessments(): readonly Assessment[] {
    return [...this._assessments]
  }

  // Domain methods
  addDiagnosis(diagnosis: Diagnosis): MedicalRecord {
    const updatedDiagnosis = [...this._diagnosis, diagnosis]
    return this.createUpdatedRecord({ diagnosis: updatedDiagnosis })
  }

  addProgressNote(note: ProgressNote): MedicalRecord {
    const updatedNotes = [...this._progressNotes, note]
    return this.createUpdatedRecord({ progressNotes: updatedNotes })
  }

  updateTreatmentPlan(plan: TreatmentPlan): MedicalRecord {
    // Create new treatment history entry
    const treatmentEntry = new TreatmentHistory(
      plan.id,
      plan.description,
      plan.startDate,
      plan.endDate,
      plan.goals,
      new Date()
    )
    
    const updatedHistory = [...this._treatmentHistory, treatmentEntry]
    return this.createUpdatedRecord({ treatmentHistory: updatedHistory })
  }

  getLatestAssessment(): Assessment | null {
    if (this._assessments.length === 0) return null
    
    return this._assessments.reduce((latest, current) => 
      current.date > latest.date ? current : latest
    )
  }

  addMedication(medication: Medication): MedicalRecord {
    const updatedMedications = [...this._medications, medication]
    return this.createUpdatedRecord({ medications: updatedMedications })
  }

  addAllergy(allergy: Allergy): MedicalRecord {
    const updatedAllergies = [...this._allergies, allergy]
    return this.createUpdatedRecord({ allergies: updatedAllergies })
  }

  addAssessment(assessment: Assessment): MedicalRecord {
    const updatedAssessments = [...this._assessments, assessment]
    return this.createUpdatedRecord({ assessments: updatedAssessments })
  }

  private createUpdatedRecord(updates: {
    diagnosis?: Diagnosis[]
    treatmentHistory?: TreatmentHistory[]
    medications?: Medication[]
    allergies?: Allergy[]
    progressNotes?: ProgressNote[]
    assessments?: Assessment[]
  }): MedicalRecord {
    return new MedicalRecord(
      this.id,
      this.patientId,
      updates.diagnosis ?? this._diagnosis,
      updates.treatmentHistory ?? this._treatmentHistory,
      updates.medications ?? this._medications,
      updates.allergies ?? this._allergies,
      updates.progressNotes ?? this._progressNotes,
      updates.assessments ?? this._assessments,
      this.createdAt,
      new Date()
    )
  }
}