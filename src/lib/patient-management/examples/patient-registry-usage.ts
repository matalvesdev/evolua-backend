// ============================================================================
// PATIENT REGISTRY SERVICE USAGE EXAMPLES
// Demonstrates how to use the PatientRegistry service layer
// ============================================================================

import { PatientRegistry, CreatePatientRequest, UpdatePatientRequest } from '../application/services/PatientRegistry'
import { SupabasePatientRepository } from '../infrastructure/repositories/SupabasePatientRepository'
import { createClient } from '@supabase/supabase-js'

// Example: Setting up the PatientRegistry service
export function createPatientRegistryService() {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Create repository
  const patientRepository = new SupabasePatientRepository(
    supabase,
    'default-clinic-id',
    'default-therapist-id'
  )

  // Create service
  return new PatientRegistry(patientRepository)
}

// Example: Creating a new patient
export async function createPatientExample() {
  const patientRegistry = createPatientRegistryService()

  const patientData: CreatePatientRequest = {
    personalInfo: {
      fullName: 'Maria Silva Santos',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'female',
      cpf: '11144477735',
      rg: '123456789'
    },
    contactInfo: {
      primaryPhone: '11987654321',
      secondaryPhone: '1133334444',
      email: 'maria.silva@email.com',
      address: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567',
        country: 'Brasil'
      }
    },
    emergencyContact: {
      name: 'João Silva Santos',
      relationship: 'spouse',
      phone: '11999887766',
      email: 'joao.silva@email.com'
    },
    insuranceInfo: {
      provider: 'Unimed',
      policyNumber: 'POL123456',
      groupNumber: 'GRP789',
      validUntil: new Date('2025-12-31')
    }
  }

  try {
    const patient = await patientRegistry.createPatient(patientData, 'therapist-user-id')
    console.log('Patient created successfully:', patient.id.value)
    return patient
  } catch (error) {
    console.error('Failed to create patient:', error)
    throw error
  }
}

// Example: Updating a patient
export async function updatePatientExample(patientId: string) {
  const patientRegistry = createPatientRegistryService()

  const updateData: UpdatePatientRequest = {
    personalInfo: {
      fullName: 'Maria Silva Santos Updated'
    },
    contactInfo: {
      email: 'maria.updated@email.com',
      secondaryPhone: '1144445555'
    }
  }

  try {
    const updatedPatient = await patientRegistry.updatePatient(patientId, updateData)
    console.log('Patient updated successfully:', updatedPatient.personalInfo.fullName.value)
    return updatedPatient
  } catch (error) {
    console.error('Failed to update patient:', error)
    throw error
  }
}

// Example: Searching for patients
export async function searchPatientsExample() {
  const patientRegistry = createPatientRegistryService()

  const searchCriteria = {
    query: 'Maria Silva',
    status: undefined, // Search all statuses
    ageRange: {
      min: 18,
      max: 65
    }
  }

  const pagination = {
    page: 1,
    limit: 10,
    sortBy: 'name' as const,
    sortOrder: 'asc' as const
  }

  try {
    const results = await patientRegistry.searchPatients(searchCriteria, pagination)
    console.log(`Found ${results.total} patients`)
    console.log(`Page ${results.page} of ${results.totalPages}`)
    
    results.data.forEach(patient => {
      console.log(`- ${patient.personalInfo.fullName.value} (${patient.personalInfo.cpf.value})`)
    })

    return results
  } catch (error) {
    console.error('Failed to search patients:', error)
    throw error
  }
}

// Example: Detecting duplicates
export async function detectDuplicatesExample() {
  const patientRegistry = createPatientRegistryService()

  const personalInfo = {
    fullName: 'Maria Silva Santos',
    dateOfBirth: new Date('1985-03-15'),
    cpf: '11144477735'
  }

  try {
    const duplicateResult = await patientRegistry.detectDuplicates(personalInfo)
    
    if (duplicateResult.isDuplicate) {
      console.log(`Found ${duplicateResult.potentialDuplicates.length} potential duplicates`)
      console.log(`Confidence level: ${duplicateResult.confidence}`)
      console.log(`Matching fields: ${duplicateResult.matchingFields.join(', ')}`)
      
      duplicateResult.potentialDuplicates.forEach(duplicate => {
        console.log(`- ${duplicate.personalInfo.fullName.value} (ID: ${duplicate.id.value})`)
      })
    } else {
      console.log('No duplicates found')
    }

    return duplicateResult
  } catch (error) {
    console.error('Failed to detect duplicates:', error)
    throw error
  }
}

// Example: Merging duplicate patients
export async function mergePatientExample(primaryPatientId: string, duplicatePatientId: string) {
  const patientRegistry = createPatientRegistryService()

  const mergeRequest = {
    primaryPatientId,
    duplicatePatientId,
    mergeStrategy: {
      personalInfo: 'primary' as const,
      contactInfo: 'merge' as const, // Merge non-empty values from duplicate
      emergencyContact: 'primary' as const,
      insuranceInfo: 'merge' as const
    }
  }

  try {
    const mergedPatient = await patientRegistry.mergePatients(mergeRequest)
    console.log('Patients merged successfully:', mergedPatient.id.value)
    return mergedPatient
  } catch (error) {
    console.error('Failed to merge patients:', error)
    throw error
  }
}

// Example: Error handling patterns
export async function errorHandlingExample() {
  const patientRegistry = createPatientRegistryService()

  try {
    // This will fail validation
    const invalidPatientData: CreatePatientRequest = {
      personalInfo: {
        fullName: '', // Empty name will fail validation
        dateOfBirth: new Date('1985-03-15'),
        gender: 'female',
        cpf: '11144477735',
        rg: '123456789'
      },
      contactInfo: {
        primaryPhone: '11987654321',
        address: {
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567'
        }
      },
      emergencyContact: {
        name: 'João Silva Santos',
        relationship: 'spouse',
        phone: '11999887766'
      }
    }

    await patientRegistry.createPatient(invalidPatientData, 'therapist-user-id')
  } catch (error: any) {
    if (error.code === 'VALIDATION_FAILED') {
      console.log('Validation errors:', error.details.errors)
      error.details.errors.forEach((validationError: any) => {
        console.log(`- ${validationError.field}: ${validationError.message}`)
      })
    } else if (error.code === 'DUPLICATE_PATIENT') {
      console.log('Duplicate patient detected:', error.details.duplicates)
    } else if (error.code === 'PATIENT_NOT_FOUND') {
      console.log('Patient not found:', error.message)
    } else {
      console.log('Unexpected error:', error.message)
    }
  }
}

// Example: Complete workflow
export async function completeWorkflowExample() {
  console.log('=== Patient Registry Service Workflow Example ===')

  try {
    // 1. Create a patient
    console.log('\n1. Creating patient...')
    const patient = await createPatientExample()

    // 2. Search for patients
    console.log('\n2. Searching patients...')
    await searchPatientsExample()

    // 3. Update the patient
    console.log('\n3. Updating patient...')
    await updatePatientExample(patient.id.value)

    // 4. Detect duplicates
    console.log('\n4. Detecting duplicates...')
    await detectDuplicatesExample()

    // 5. Get patient by ID
    console.log('\n5. Retrieving patient...')
    const patientRegistry = createPatientRegistryService()
    const retrievedPatient = await patientRegistry.getPatient(patient.id.value)
    if (retrievedPatient) {
      console.log('Patient retrieved:', retrievedPatient.personalInfo.fullName.value)
    }

    console.log('\n✅ Workflow completed successfully!')
  } catch (error) {
    console.error('❌ Workflow failed:', error)
  }
}