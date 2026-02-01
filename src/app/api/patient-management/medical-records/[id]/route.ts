// ============================================================================
// PATIENT MANAGEMENT API - INDIVIDUAL MEDICAL RECORD ENDPOINTS
// REST API endpoints for individual medical record operations
// Requirements: 2.1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MedicalRecordManager } from '@/lib/patient-management/application/services/MedicalRecordManager'
import { SupabaseMedicalRecordRepository } from '@/lib/patient-management/infrastructure/repositories/SupabaseMedicalRecordRepository'
import { MedicalRecordId } from '@/lib/patient-management/domain/value-objects/MedicalRecordId'
import { UserId } from '@/lib/patient-management/domain/value-objects/UserId'

/**
 * GET /api/patient-management/medical-records/[id]
 * Get a specific medical record by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Initialize repository and service
    const repository = new SupabaseMedicalRecordRepository(supabase)
    const medicalRecordManager = new MedicalRecordManager(repository)

    // Get medical record
    const recordId = new MedicalRecordId(id)
    const record = await medicalRecordManager.getMedicalRecord(recordId)

    if (!record) {
      return NextResponse.json(
        { error: 'Medical record not found' },
        { status: 404 }
      )
    }

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

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error getting medical record:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get medical record',
        code: 'RETRIEVAL_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/patient-management/medical-records/[id]
 * Update a specific medical record
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()

    // Initialize repository and service
    const repository = new SupabaseMedicalRecordRepository(supabase)
    const medicalRecordManager = new MedicalRecordManager(repository)

    // Build update request
    const updateData: any = {}

    if (body.diagnosis) {
      updateData.diagnosis = body.diagnosis.map((d: any) => ({
        code: d.code,
        description: d.description,
        diagnosedAt: new Date(d.diagnosedAt),
        severity: d.severity
      }))
    }

    if (body.medications) {
      updateData.medications = body.medications.map((m: any) => ({
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
      updateData.allergies = body.allergies.map((a: any) => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        diagnosedAt: new Date(a.diagnosedAt),
        notes: a.notes
      }))
    }

    // Update medical record
    const recordId = new MedicalRecordId(id)
    const updatedBy = new UserId(user.id)
    const record = await medicalRecordManager.updateMedicalRecord(
      recordId,
      updateData,
      updatedBy
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

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error updating medical record:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update medical record',
        code: 'UPDATE_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patient-management/medical-records/[id]/progress-notes
 * Add a progress note to a medical record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()

    if (!body.content || !body.sessionDate || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: content, sessionDate, category' },
        { status: 400 }
      )
    }

    // Initialize repository and service
    const repository = new SupabaseMedicalRecordRepository(supabase)
    const medicalRecordManager = new MedicalRecordManager(repository)

    // Add progress note
    const recordId = new MedicalRecordId(id)
    await medicalRecordManager.addProgressNote(recordId, {
      content: body.content,
      sessionDate: new Date(body.sessionDate),
      category: body.category,
      createdBy: user.id
    })

    return NextResponse.json(
      { success: true, message: 'Progress note added successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] Error adding progress note:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to add progress note',
        code: 'CREATION_FAILED'
      },
      { status: 500 }
    )
  }
}
