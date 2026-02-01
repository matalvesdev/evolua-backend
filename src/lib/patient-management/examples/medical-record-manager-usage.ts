// ============================================================================
// MEDICAL RECORD MANAGER USAGE EXAMPLES
// Demonstrates how to use the Medical Record Manager service
// ============================================================================

import { MedicalRecordManager } from '../application/services/MedicalRecordManager'
import { SupabaseMedicalRecordRepository } from '../infrastructure/repositories/SupabaseMedicalRecordRepository'
import { PatientId } from '../domain/value-objects/PatientId'
import { UserId } from '../domain/value-objects/UserId'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (in real app, this would come from your config)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-key'
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize repository and service
const medicalRecordRepository = new SupabaseMedicalRecordRepository(supabase)
const medicalRecordManager = new MedicalRecordManager(medicalRecordRepository)

// ============================================================================
// EXAMPLE 1: Creating a comprehensive medical record
// ============================================================================

export async function createComprehensiveMedicalRecord() {
  const patientId = new PatientId('patient-123')
  const createdBy = new UserId('therapist-456')

  try {
    const medicalRecord = await medicalRecordManager.createMedicalRecord(
      patientId,
      {
        // Speech therapy diagnosis
        diagnosis: [
          {
            code: 'F80.1',
            description: 'Expressive language disorder',
            diagnosedAt: new Date('2024-01-15'),
            severity: 'moderate'
          },
          {
            code: 'F80.2',
            description: 'Mixed receptive-expressive language disorder',
            diagnosedAt: new Date('2024-01-20'),
            severity: 'mild'
          }
        ],

        // Speech therapy interventions (treated as medications)
        medications: [
          {
            name: 'Articulation therapy exercises',
            dosage: '30 minutes',
            frequency: 'Daily',
            startDate: new Date('2024-01-16'),
            prescribedBy: 'Dr. Maria Silva',
            notes: 'Focus on /r/ and /l/ sounds'
          },
          {
            name: 'Language comprehension activities',
            dosage: '45 minutes',
            frequency: 'Twice weekly',
            startDate: new Date('2024-01-18'),
            prescribedBy: 'Dr. Maria Silva',
            notes: 'Use visual aids and repetition'
          }
        ],

        // Patient allergies
        allergies: [
          {
            allergen: 'Latex',
            reaction: 'Skin rash and itching',
            severity: 'mild',
            diagnosedAt: new Date('2024-01-10'),
            notes: 'Use non-latex gloves during therapy'
          }
        ],

        // Initial assessment
        initialAssessment: {
          type: 'Initial Speech and Language Assessment',
          findings: 'Patient demonstrates significant difficulty with expressive language. Receptive language skills are within normal limits for age. Articulation errors noted with liquid sounds.',
          recommendations: [
            'Begin articulation therapy focusing on /r/ and /l/ sounds',
            'Implement expressive language activities',
            'Home practice program for parents',
            'Re-evaluate in 3 months'
          ],
          assessedBy: createdBy.value,
          date: new Date('2024-01-15'),
          results: {
            expressiveLanguageScore: 65,
            receptiveLanguageScore: 85,
            articulationScore: 70,
            overallScore: 73
          }
        }
      },
      createdBy
    )

    console.log('Medical record created successfully:', medicalRecord.id.value)
    return medicalRecord

  } catch (error) {
    console.error('Failed to create medical record:', error)
    throw error
  }
}

// ============================================================================
// EXAMPLE 2: Adding progress notes during therapy sessions
// ============================================================================

export async function addTherapyProgressNotes(recordId: string) {
  try {
    // Session 1 progress note
    await medicalRecordManager.addProgressNote(
      new MedicalRecordId(recordId),
      {
        content: 'Patient showed good engagement during articulation exercises. Successfully produced /r/ sound in isolation 7/10 times. Continues to struggle with /r/ in word-initial position. Recommended increased home practice.',
        sessionDate: new Date('2024-01-22'),
        category: 'treatment',
        createdBy: 'therapist-456'
      }
    )

    // Session 2 progress note
    await medicalRecordManager.addProgressNote(
      new MedicalRecordId(recordId),
      {
        content: 'Noticeable improvement in expressive language. Patient initiated conversation 3 times during session. Articulation of /l/ sound improved to 8/10 accuracy in syllables. Parents report increased verbal communication at home.',
        sessionDate: new Date('2024-01-29'),
        category: 'goal_progress',
        createdBy: 'therapist-456'
      }
    )

    // Assessment progress note
    await medicalRecordManager.addProgressNote(
      new MedicalRecordId(recordId),
      {
        content: 'Mid-therapy assessment shows 15% improvement in expressive language scores. Articulation errors reduced by 30%. Patient demonstrates increased confidence in verbal communication.',
        sessionDate: new Date('2024-02-05'),
        category: 'assessment',
        createdBy: 'therapist-456'
      }
    )

    console.log('Progress notes added successfully')

  } catch (error) {
    console.error('Failed to add progress notes:', error)
    throw error
  }
}

// ============================================================================
// EXAMPLE 3: Adding formal assessments
// ============================================================================

export async function addFormalAssessment(recordId: string) {
  try {
    await medicalRecordManager.addAssessment(
      new MedicalRecordId(recordId),
      {
        type: '3-Month Progress Assessment',
        findings: 'Significant improvement observed across all areas. Expressive language skills have improved by 25%. Articulation errors reduced from 40% to 15%. Patient demonstrates increased confidence and willingness to communicate verbally.',
        recommendations: [
          'Continue current therapy approach',
          'Introduce more complex language structures',
          'Begin group therapy sessions for social communication',
          'Reduce therapy frequency to once weekly',
          'Schedule 6-month follow-up assessment'
        ],
        assessedBy: 'therapist-456',
        date: new Date('2024-04-15'),
        results: {
          expressiveLanguageScore: 81,
          receptiveLanguageScore: 88,
          articulationScore: 85,
          overallScore: 85,
          improvementPercentage: 25,
          goalsAchieved: 3,
          totalGoals: 4
        }
      }
    )

    console.log('Formal assessment added successfully')

  } catch (error) {
    console.error('Failed to add assessment:', error)
    throw error
  }
}

// ============================================================================
// EXAMPLE 4: Updating medical record with new information
// ============================================================================

export async function updateMedicalRecordWithNewDiagnosis(recordId: string) {
  try {
    const updatedRecord = await medicalRecordManager.updateMedicalRecord(
      new MedicalRecordId(recordId),
      {
        // Add new diagnosis discovered during therapy
        diagnosis: [
          {
            code: 'F80.1',
            description: 'Expressive language disorder',
            diagnosedAt: new Date('2024-01-15'),
            severity: 'moderate'
          },
          {
            code: 'F80.2',
            description: 'Mixed receptive-expressive language disorder',
            diagnosedAt: new Date('2024-01-20'),
            severity: 'mild'
          },
          {
            code: 'F80.81',
            description: 'Childhood onset fluency disorder (stuttering)',
            diagnosedAt: new Date('2024-03-10'),
            severity: 'mild'
          }
        ],

        // Update therapy interventions
        medications: [
          {
            name: 'Articulation therapy exercises',
            dosage: '30 minutes',
            frequency: 'Daily',
            startDate: new Date('2024-01-16'),
            prescribedBy: 'Dr. Maria Silva',
            notes: 'Focus on /r/ and /l/ sounds - showing good progress'
          },
          {
            name: 'Language comprehension activities',
            dosage: '45 minutes',
            frequency: 'Twice weekly',
            startDate: new Date('2024-01-18'),
            prescribedBy: 'Dr. Maria Silva',
            notes: 'Use visual aids and repetition'
          },
          {
            name: 'Fluency therapy techniques',
            dosage: '20 minutes',
            frequency: 'Daily',
            startDate: new Date('2024-03-12'),
            prescribedBy: 'Dr. Maria Silva',
            notes: 'Easy onset and light articulatory contacts'
          }
        ]
      },
      new UserId('therapist-456')
    )

    console.log('Medical record updated successfully')
    return updatedRecord

  } catch (error) {
    console.error('Failed to update medical record:', error)
    throw error
  }
}

// ============================================================================
// EXAMPLE 5: Generating treatment timeline
// ============================================================================

export async function generateTreatmentTimeline(patientId: string) {
  try {
    const timeline = await medicalRecordManager.getTimelineView(new PatientId(patientId))

    console.log('Treatment Timeline for Patient:', patientId)
    console.log('Total Records:', timeline.records.length)
    console.log('Total Events:', timeline.chronologicalEvents.length)

    // Display chronological events
    timeline.chronologicalEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.date.toDateString()} - ${event.type}: ${event.description}`)
    })

    return timeline

  } catch (error) {
    console.error('Failed to generate treatment timeline:', error)
    throw error
  }
}

// ============================================================================
// EXAMPLE 6: Performing integrity checks
// ============================================================================

export async function performMedicalRecordIntegrityCheck(recordId: string) {
  try {
    const record = await medicalRecordManager.getMedicalRecord(new MedicalRecordId(recordId))
    
    if (!record) {
      throw new Error('Medical record not found')
    }

    const integrityCheck = await medicalRecordManager.performIntegrityChecks(record)

    console.log('Integrity Check Results:')
    console.log('Overall Status:', integrityCheck.overallStatus)
    
    integrityCheck.checks.forEach(check => {
      console.log(`- ${check.checkType}: ${check.status} - ${check.message}`)
      if (check.details) {
        console.log('  Details:', check.details)
      }
    })

    return integrityCheck

  } catch (error) {
    console.error('Failed to perform integrity check:', error)
    throw error
  }
}

// ============================================================================
// EXAMPLE 7: Complete workflow example
// ============================================================================

export async function completeTherapyWorkflow() {
  try {
    console.log('Starting complete therapy workflow...')

    // 1. Create initial medical record
    const medicalRecord = await createComprehensiveMedicalRecord()
    console.log('✓ Medical record created')

    // 2. Add progress notes over time
    await addTherapyProgressNotes(medicalRecord.id.value)
    console.log('✓ Progress notes added')

    // 3. Add formal assessment
    await addFormalAssessment(medicalRecord.id.value)
    console.log('✓ Formal assessment added')

    // 4. Update record with new findings
    await updateMedicalRecordWithNewDiagnosis(medicalRecord.id.value)
    console.log('✓ Medical record updated')

    // 5. Generate treatment timeline
    await generateTreatmentTimeline(medicalRecord.patientId.value)
    console.log('✓ Treatment timeline generated')

    // 6. Perform integrity checks
    await performMedicalRecordIntegrityCheck(medicalRecord.id.value)
    console.log('✓ Integrity checks completed')

    console.log('Complete therapy workflow finished successfully!')

  } catch (error) {
    console.error('Workflow failed:', error)
    throw error
  }
}

// ============================================================================
// EXAMPLE 8: Error handling and validation examples
// ============================================================================

export async function demonstrateValidationAndErrorHandling() {
  const patientId = new PatientId('patient-123')
  const createdBy = new UserId('therapist-456')

  try {
    // This will fail due to validation errors
    await medicalRecordManager.createMedicalRecord(
      patientId,
      {
        diagnosis: [
          {
            code: '', // Invalid: empty code
            description: 'Some diagnosis',
            diagnosedAt: new Date(),
            severity: 'moderate'
          }
        ],
        medications: [
          {
            name: 'Some medication',
            dosage: '', // Invalid: empty dosage
            frequency: 'Daily',
            startDate: new Date(),
            prescribedBy: 'Dr. Silva'
          }
        ]
      },
      createdBy
    )

  } catch (error) {
    console.log('Expected validation error:', error.message)
  }

  try {
    // This will fail due to future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)

    await medicalRecordManager.createMedicalRecord(
      patientId,
      {
        diagnosis: [
          {
            code: 'F80.1',
            description: 'Some diagnosis',
            diagnosedAt: futureDate, // Invalid: future date
            severity: 'moderate'
          }
        ]
      },
      createdBy
    )

  } catch (error) {
    console.log('Expected future date error:', error.message)
  }

  console.log('Validation and error handling demonstration completed')
}

// Import MedicalRecordId for the examples
import { MedicalRecordId } from '../domain/value-objects/MedicalRecordId'