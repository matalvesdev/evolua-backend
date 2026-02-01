// ============================================================================
// PATIENT MANAGEMENT API - INDIVIDUAL PATIENT ENDPOINTS
// REST API endpoints for individual patient operations
// Requirements: 1.1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PatientRegistry } from '@/lib/patient-management/application/services/PatientRegistry'
import { SupabasePatientRepository } from '@/lib/patient-management/infrastructure/repositories/SupabasePatientRepository'

/**
 * GET /api/patient-management/patients/[id]
 * Get a specific patient by ID
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
    const repository = new SupabasePatientRepository(
      supabase,
      user.id,
      user.id
    )
    const patientRegistry = new PatientRegistry(repository)

    // Get patient
    const patient = await patientRegistry.getPatient(id)

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Map to API response format
    const response = {
      id: patient.id.value,
      personalInfo: {
        fullName: patient.personalInfo.fullName.value,
        dateOfBirth: patient.personalInfo.dateOfBirth.toISOString(),
        age: patient.personalInfo.getAge(),
        gender: patient.personalInfo.gender.value,
        cpf: patient.personalInfo.cpf.value,
        rg: patient.personalInfo.rg.value
      },
      contactInfo: {
        primaryPhone: patient.contactInfo.primaryPhone.value,
        secondaryPhone: patient.contactInfo.secondaryPhone?.value,
        email: patient.contactInfo.email?.value,
        address: {
          street: patient.contactInfo.address.street,
          number: patient.contactInfo.address.number,
          complement: patient.contactInfo.address.complement,
          neighborhood: patient.contactInfo.address.neighborhood,
          city: patient.contactInfo.address.city,
          state: patient.contactInfo.address.state,
          zipCode: patient.contactInfo.address.zipCode
        }
      },
      emergencyContact: {
        name: patient.emergencyContact.name.value,
        phone: patient.emergencyContact.phone.value,
        relationship: patient.emergencyContact.relationship
      },
      insuranceInfo: {
        provider: patient.insuranceInfo.provider,
        policyNumber: patient.insuranceInfo.policyNumber,
        groupNumber: patient.insuranceInfo.groupNumber,
        validUntil: patient.insuranceInfo.validUntil?.toISOString()
      },
      status: patient.status.value,
      isActive: patient.isActive(),
      canScheduleAppointment: patient.canScheduleAppointment(),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error getting patient:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get patient',
        code: 'RETRIEVAL_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/patient-management/patients/[id]
 * Update a specific patient
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
    const repository = new SupabasePatientRepository(
      supabase,
      user.id,
      user.id
    )
    const patientRegistry = new PatientRegistry(repository)

    // Build update request
    const updateRequest: any = {}

    if (body.personalInfo) {
      updateRequest.personalInfo = {
        fullName: body.personalInfo.fullName,
        dateOfBirth: body.personalInfo.dateOfBirth ? new Date(body.personalInfo.dateOfBirth) : undefined,
        gender: body.personalInfo.gender,
        cpf: body.personalInfo.cpf,
        rg: body.personalInfo.rg
      }
    }

    if (body.contactInfo) {
      updateRequest.contactInfo = {
        primaryPhone: body.contactInfo.primaryPhone,
        secondaryPhone: body.contactInfo.secondaryPhone,
        email: body.contactInfo.email,
        address: body.contactInfo.address
      }
    }

    if (body.emergencyContact) {
      updateRequest.emergencyContact = {
        name: body.emergencyContact.name,
        relationship: body.emergencyContact.relationship,
        phone: body.emergencyContact.phone,
        email: body.emergencyContact.email
      }
    }

    if (body.insuranceInfo) {
      updateRequest.insuranceInfo = {
        provider: body.insuranceInfo.provider,
        policyNumber: body.insuranceInfo.policyNumber,
        groupNumber: body.insuranceInfo.groupNumber,
        validUntil: body.insuranceInfo.validUntil ? new Date(body.insuranceInfo.validUntil) : undefined
      }
    }

    // Update patient
    const patient = await patientRegistry.updatePatient(id, updateRequest)

    // Map to API response format
    const response = {
      id: patient.id.value,
      personalInfo: {
        fullName: patient.personalInfo.fullName.value,
        dateOfBirth: patient.personalInfo.dateOfBirth.toISOString(),
        age: patient.personalInfo.getAge(),
        gender: patient.personalInfo.gender.value,
        cpf: patient.personalInfo.cpf.value,
        rg: patient.personalInfo.rg.value
      },
      contactInfo: {
        primaryPhone: patient.contactInfo.primaryPhone.value,
        secondaryPhone: patient.contactInfo.secondaryPhone?.value,
        email: patient.contactInfo.email?.value,
        address: {
          street: patient.contactInfo.address.street,
          number: patient.contactInfo.address.number,
          complement: patient.contactInfo.address.complement,
          neighborhood: patient.contactInfo.address.neighborhood,
          city: patient.contactInfo.address.city,
          state: patient.contactInfo.address.state,
          zipCode: patient.contactInfo.address.zipCode
        }
      },
      emergencyContact: {
        name: patient.emergencyContact.name.value,
        phone: patient.emergencyContact.phone.value,
        relationship: patient.emergencyContact.relationship
      },
      insuranceInfo: {
        provider: patient.insuranceInfo.provider,
        policyNumber: patient.insuranceInfo.policyNumber,
        groupNumber: patient.insuranceInfo.groupNumber,
        validUntil: patient.insuranceInfo.validUntil?.toISOString()
      },
      status: patient.status.value,
      isActive: patient.isActive(),
      canScheduleAppointment: patient.canScheduleAppointment(),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error updating patient:', error)
    
    // Handle specific error types
    if ((error as any).code === 'PATIENT_NOT_FOUND') {
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Patient not found',
          code: 'PATIENT_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    if ((error as any).code === 'VALIDATION_FAILED') {
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: (error as any).details
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update patient',
        code: 'UPDATE_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/patient-management/patients/[id]
 * Delete a specific patient
 */
export async function DELETE(
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
    const repository = new SupabasePatientRepository(
      supabase,
      user.id,
      user.id
    )
    const patientRegistry = new PatientRegistry(repository)

    // Delete patient
    await patientRegistry.deletePatient(id)

    return NextResponse.json(
      { success: true, message: 'Patient deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API] Error deleting patient:', error)
    
    // Handle specific error types
    if ((error as any).code === 'PATIENT_NOT_FOUND') {
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Patient not found',
          code: 'PATIENT_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete patient',
        code: 'DELETION_FAILED'
      },
      { status: 500 }
    )
  }
}
