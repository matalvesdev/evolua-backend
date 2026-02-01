// ============================================================================
// PATIENT MANAGEMENT API - MEDICAL RECORDS ENDPOINTS
// REST API endpoints for medical record operations
// Requirements: 2.1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MedicalRecordManager } from '@/lib/patient-management/application/services/MedicalRecordManager'
import { SupabaseMedicalRecordRepository } from '@/lib/patient-management/infrastructure/repositories/SupabaseMedicalRecordRepository'
import { PatientId } from '@/lib/patient-management/domain/value-objects/PatientId'
import { UserId } from '@/lib/patient-management/domain/value-objects/UserId'

/**
 * GET /api/patient-management/medical-records?patientId=xxx
 * Get all medical records for a patient
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const patientIdParam = searchParams.get('patientId')

    if (!patientIdParam) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    // Initialize repository and service
    const repository = new SupabaseMedicalRecordRepository(supabase)
    const medicalRecordManager = new MedicalRecordManager(repository)

    // Get medical history
    const patientId = new PatientId(patientIdParam)
    const records = await medicalRecordManager.getMedicalHistory(patientId)

    // Map to API response format
    const response = records.map(record => ({
      id: record.id.value,
      patientId: record.patientId.value,
      diagnosis: record.diagnosis.map(d => ({
        code: d.code,
        description: d.description,
        diagnosedAt: d.diagnosedAt.toISOString(),
        severity: d.severity
      })),
      medications: record.medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate?.toISOString(),
        prescribedBy: m.prescribedBy,
        isActive: m.isActive()
      })),
      allergies: record.allergies.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        diagnosedAt: a.diagnosedAt.toISOString()
      })),
      progressNotes: record.progressNotes.map(note => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        createdBy: note.createdBy.value,
        sessionDate: note.sessionDate.toISOString(),
        category: note.category
      })),
      assessments: record.assessments.map(assessment => ({
        id: assessment.id,
        type: assessment.type,
        findings: assessment.findings,
        recommendations: assessment.recommendations,
        date: assessment.date.toISOString(),
        assessedBy: assessment.assessedBy.value
      })),
      treatmentHistory: record.treatmentHistory.map(treatment => ({
        description: treatment.description,
        startDate: treatment.startDate.toISOString(),
        endDate: treatment.endDate?.toISOString(),
        status: treatment.status,
        goals: treatment.goals
      })),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    }))

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error getting medical records:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get medical records',
        code: 'RETRIEVAL_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patient-management/medical-records
 * Create a new medical record
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    if (!body.patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    // Initialize repository and service
    const repository = new SupabaseMedicalRecordRepository(supabase)
    const medicalRecordManager = new MedicalRecordManager(repository)

    // Create medical record
    const patientId = new PatientId(body.patientId)
    const createdBy = new UserId(user.id)

    const recordData: any = {}
    
    if (body.diagnosis) {
      recordData.diagnosis = body.diagnosis.map((d: any) => ({
        code: d.code,
        description: d.description,
        diagnosedAt: new Date(d.diagnosedAt),
        severity: d.severity
      }))
    }

    if (body.medications) {
      recordData.medications = body.medications.map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: new Date(m.startDate),
        endDate: m.endDate ? new Date(m.endDate) : undefined,
        prescribedBy: m.prescribedBy,
        notes: m.notes
      }))
    }

    if (body.allergies) {
      recordData.allergies = body.allergies.map((a: any) => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        diagnosedAt: new Date(a.diagnosedAt),
        notes: a.notes
      }))
    }

    if (body.initialAssessment) {
      recordData.initialAssessment = {
        type: body.initialAssessment.type,
        findings: body.initialAssessment.findings,
        recommendations: body.initialAssessment.recommendations,
        assessedBy: body.initialAssessment.assessedBy,
        date: new Date(body.initialAssessment.date),
        results: body.initialAssessment.results
      }
    }

    const record = await medicalRecordManager.createMedicalRecord(
      patientId,
      recordData,
      createdBy
    )

    // Map to API response format
    const response = {
      id: record.id.value,
      patientId: record.patientId.value,
      diagnosis: record.diagnosis.map(d => ({
        code: d.code,
        description: d.description,
        diagnosedAt: d.diagnosedAt.toISOString(),
        severity: d.severity
      })),
      medications: record.medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate?.toISOString(),
        prescribedBy: m.prescribedBy,
        isActive: m.isActive()
      })),
      allergies: record.allergies.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        diagnosedAt: a.diagnosedAt.toISOString()
      })),
      progressNotes: record.progressNotes.map(note => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        createdBy: note.createdBy.value,
        sessionDate: note.sessionDate.toISOString(),
        category: note.category
      })),
      assessments: record.assessments.map(assessment => ({
        id: assessment.id,
        type: assessment.type,
        findings: assessment.findings,
        recommendations: assessment.recommendations,
        date: assessment.date.toISOString(),
        assessedBy: assessment.assessedBy.value
      })),
      treatmentHistory: record.treatmentHistory.map(treatment => ({
        description: treatment.description,
        startDate: treatment.startDate.toISOString(),
        endDate: treatment.endDate?.toISOString(),
        status: treatment.status,
        goals: treatment.goals
      })),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating medical record:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create medical record',
        code: 'CREATION_FAILED'
      },
      { status: 500 }
    )
  }
}
