// ============================================================================
// PATIENT REPOSITORY INTERFACE
// Defines the contract for patient data persistence operations
// ============================================================================

import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'

// Search criteria for patient queries
export interface SearchCriteria {
  query?: string // General search query (name, email, phone, etc.)
  status?: PatientStatus
  ageRange?: {
    min?: number
    max?: number
  }
  diagnosis?: string
  treatmentType?: string
  createdAfter?: Date
  createdBefore?: Date
}

// Pagination parameters
export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status'
  sortOrder?: 'asc' | 'desc'
}

// Paginated result wrapper
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Patient creation data
export interface CreatePatientData {
  personalInfo: {
    fullName: string
    dateOfBirth: Date
    gender: string
    cpf: string
    rg: string
  }
  contactInfo: {
    primaryPhone: string
    secondaryPhone?: string
    email?: string
    address: {
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
      zipCode: string
      country: string
    }
  }
  emergencyContact: {
    name: string
    relationship: string
    phone: string
    email?: string
  }
  insuranceInfo: {
    provider?: string
    policyNumber?: string
    groupNumber?: string
    validUntil?: Date
  }
}

// Patient update data (partial)
export interface UpdatePatientData {
  personalInfo?: Partial<CreatePatientData['personalInfo']>
  contactInfo?: Partial<CreatePatientData['contactInfo']>
  emergencyContact?: Partial<CreatePatientData['emergencyContact']>
  insuranceInfo?: Partial<CreatePatientData['insuranceInfo']>
}

/**
 * Patient Repository Interface
 * 
 * Defines the contract for patient data persistence operations.
 * Implementations should handle data validation, error handling,
 * and maintain audit trails for all operations.
 * 
 * Requirements: 1.1, 1.5, 7.1, 7.2
 */
export interface IPatientRepository {
  /**
   * Create a new patient record
   * @param patientData - Patient data for creation
   * @param createdBy - ID of the user creating the patient
   * @returns Promise resolving to the created Patient entity
   * @throws Error if validation fails or creation is unsuccessful
   */
  create(patientData: CreatePatientData, createdBy: string): Promise<Patient>

  /**
   * Retrieve a patient by ID
   * @param id - Patient ID
   * @returns Promise resolving to Patient entity or null if not found
   */
  findById(id: PatientId): Promise<Patient | null>

  /**
   * Update an existing patient
   * @param id - Patient ID
   * @param updates - Partial patient data for update
   * @returns Promise resolving to updated Patient entity
   * @throws Error if patient not found or update fails
   */
  update(id: PatientId, updates: UpdatePatientData): Promise<Patient>

  /**
   * Delete a patient record
   * @param id - Patient ID
   * @returns Promise resolving when deletion is complete
   * @throws Error if patient not found or deletion fails
   */
  delete(id: PatientId): Promise<void>

  /**
   * Search patients with criteria and pagination
   * @param criteria - Search criteria
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated search results
   */
  search(
    criteria: SearchCriteria,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>>

  /**
   * Find patients by status
   * @param status - Patient status to filter by
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  findByStatus(
    status: PatientStatus,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>>

  /**
   * Find patients by name (fuzzy search)
   * @param name - Name to search for
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  findByName(
    name: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>>

  /**
   * Find patients by contact information
   * @param contact - Phone number or email to search for
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  findByContact(
    contact: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>>

  /**
   * Check if a patient with the given CPF already exists
   * @param cpf - CPF to check
   * @returns Promise resolving to true if exists, false otherwise
   */
  existsByCpf(cpf: string): Promise<boolean>

  /**
   * Find potential duplicate patients based on personal information
   * @param personalInfo - Personal information to match against
   * @returns Promise resolving to array of potential duplicate patients
   */
  findPotentialDuplicates(personalInfo: {
    fullName: string
    dateOfBirth: Date
    cpf?: string
  }): Promise<Patient[]>

  /**
   * Get total count of patients
   * @returns Promise resolving to total patient count
   */
  count(): Promise<number>

  /**
   * Get count of patients by status
   * @param status - Status to count
   * @returns Promise resolving to count
   */
  countByStatus(status: PatientStatus): Promise<number>
}