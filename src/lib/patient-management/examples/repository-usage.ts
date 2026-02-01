// ============================================================================
// PATIENT REPOSITORY USAGE EXAMPLES
// Examples showing how to use the Patient Repository
// ============================================================================

import { createClient } from '@/lib/supabase/client'
import { PatientRepositoryFactory, CreatePatientData } from '../infrastructure'
import { PatientStatus } from '../domain/value-objects/PatientStatus'

/**
 * Example: Creating and using a Patient Repository
 */
export async function examplePatientRepositoryUsage() {
  // Create Supabase client
  const supabase = createClient()
  
  // Create repository instance
  const patientRepository = PatientRepositoryFactory.createDefault(
    supabase,
    'current-user-id',
    'current-clinic-id'
  )

  // Example: Create a new patient
  const newPatientData: CreatePatientData = {
    personalInfo: {
      fullName: 'João Silva',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      cpf: '11144477735',
      rg: '123456789'
    },
    contactInfo: {
      primaryPhone: '11987654321',
      email: 'joao@example.com',
      address: {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567',
        country: 'Brasil'
      }
    },
    emergencyContact: {
      name: 'Maria Silva',
      relationship: 'spouse',
      phone: '11876543210'
    },
    insuranceInfo: {
      provider: 'Unimed',
      policyNumber: '123456'
    }
  }

  try {
    // Create patient
    const patient = await patientRepository.create(newPatientData, 'current-user-id')
    console.log('Patient created:', patient.id.value)

    // Find patient by ID
    const foundPatient = await patientRepository.findById(patient.id)
    console.log('Found patient:', foundPatient?.personalInfo.fullName.value)

    // Check if CPF exists
    const cpfExists = await patientRepository.existsByCpf('11144477735')
    console.log('CPF exists:', cpfExists)

    // Search patients
    const searchResults = await patientRepository.search(
      { query: 'João' },
      { page: 1, limit: 10 }
    )
    console.log('Search results:', searchResults.total)

    // Get patients by status
    const activePatients = await patientRepository.findByStatus(
      new PatientStatus('active'),
      { page: 1, limit: 10 }
    )
    console.log('Active patients:', activePatients.total)

    // Count patients
    const totalPatients = await patientRepository.count()
    console.log('Total patients:', totalPatients)

  } catch (error) {
    console.error('Error:', error)
  }
}

/**
 * Example: Search and filtering
 */
export async function exampleSearchAndFiltering() {
  const supabase = createClient()
  const patientRepository = PatientRepositoryFactory.createDefault(
    supabase,
    'current-user-id'
  )

  try {
    // Search by name
    const nameResults = await patientRepository.findByName(
      'João',
      { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }
    )

    // Search by contact
    const contactResults = await patientRepository.findByContact(
      '11987654321',
      { page: 1, limit: 10 }
    )

    // Advanced search with multiple criteria
    const advancedResults = await patientRepository.search(
      {
        query: 'Silva',
        status: new PatientStatus('active'),
        ageRange: { min: 18, max: 65 },
        createdAfter: new Date('2024-01-01')
      },
      { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }
    )

    console.log('Advanced search results:', advancedResults.data.length)

  } catch (error) {
    console.error('Search error:', error)
  }
}

/**
 * Example: Duplicate detection
 */
export async function exampleDuplicateDetection() {
  const supabase = createClient()
  const patientRepository = PatientRepositoryFactory.createDefault(
    supabase,
    'current-user-id'
  )

  try {
    // Find potential duplicates
    const duplicates = await patientRepository.findPotentialDuplicates({
      fullName: 'João Silva',
      dateOfBirth: new Date('1990-01-01'),
      cpf: '11144477735'
    })

    if (duplicates.length > 0) {
      console.log('Potential duplicates found:', duplicates.length)
      duplicates.forEach(patient => {
        console.log(`- ${patient.personalInfo.fullName.value} (${patient.id.value})`)
      })
    } else {
      console.log('No duplicates found')
    }

  } catch (error) {
    console.error('Duplicate detection error:', error)
  }
}