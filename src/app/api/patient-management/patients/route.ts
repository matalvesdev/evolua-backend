// ============================================================================
// PATIENT MANAGEMENT API - PATIENTS CRUD ENDPOINTS
// REST API endpoints for patient operations
// Requirements: 1.1, 7.1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PatientRegistry } from '@/lib/patient-management/application/services/PatientRegistry'
import { SupabasePatientRepository } from '@/lib/patient-management/infrastructure/repositories/SupabasePatientRepository'
import { PatientStatus } from '@/lib/patient-management/domain/value-objects/PatientStatus'

/**
 * GET /api/patient-management/patients
 * Search and list patients with filtering and pagination
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const query = searchParams.get('query') || undefined
    const status = searchParams.get('status') || undefined
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
    
    // Parse age range if provided
    const minAge = searchParams.get('minAge')
    const maxAge = searchParams.get('maxAge')
    const ageRange = (minAge || maxAge) ? {
      min: minAge ? parseInt(minAge) : undefined,
      max: maxAge ? parseInt(maxAge) : undefined
    } : undefined

    // Parse date range if provided
    const createdAfter = searchParams.get('createdAfter')
    const createdBefore = searchParams.get('createdBefore')

    // Initialize repository and service
    const repository = new SupabasePatientRepository(
      supabase,
      user.id, // Using user ID as clinic ID for now
      user.id
    )
    const patientRegistry = new PatientRegistry(repository)

    // Build search criteria
    const criteria: any = {}
    if (query) criteria.query = query
    if (status) criteria.status = new PatientStatus(status)
    if (ageRange) criteria.ageRange = ageRange
    if (createdAfter) criteria.createdAfter = new Date(createdAfter)
    if (createdBefore) criteria.createdBefore = new Date(createdBefore)

    // Execute search
    const result = await patientRegistry.searchPatients(criteria, {
      page,
      limit,
      sortBy,
      sortOrder
    })

    // Map to API response format
    const response = {
      data: result.data.map(patient => ({
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
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error searching patients:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to search patients',
        code: (error as any).code || 'SEARCH_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patient-management/patients
 * Create a new patient
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

    // Validate required fields
    if (!body.personalInfo || !body.contactInfo || !body.emergencyContact) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Initialize repository and service
    const repository = new SupabasePatientRepository(
      supabase,
      user.id,
      user.id
    )
    const patientRegistry = new PatientRegistry(repository)

    // Create patient
    const patient = await patientRegistry.createPatient(
      {
        personalInfo: {
          fullName: body.personalInfo.fullName,
          dateOfBirth: new Date(body.personalInfo.dateOfBirth),
          gender: body.personalInfo.gender,
          cpf: body.personalInfo.cpf,
          rg: body.personalInfo.rg
        },
        contactInfo: {
          primaryPhone: body.contactInfo.primaryPhone,
          secondaryPhone: body.contactInfo.secondaryPhone,
          email: body.contactInfo.email,
          address: body.contactInfo.address
        },
        emergencyContact: {
          name: body.emergencyContact.name,
          relationship: body.emergencyContact.relationship,
          phone: body.emergencyContact.phone,
          email: body.emergencyContact.email
        },
        insuranceInfo: body.insuranceInfo
      },
      user.id
    )

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

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating patient:', error)
    
    // Handle specific error types
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

    if ((error as any).code === 'DUPLICATE_PATIENT') {
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Duplicate patient detected',
          code: 'DUPLICATE_PATIENT',
          details: (error as any).details
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create patient',
        code: 'CREATION_FAILED'
      },
      { status: 500 }
    )
  }
}
