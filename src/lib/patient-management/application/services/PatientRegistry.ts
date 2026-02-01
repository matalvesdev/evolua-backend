// ============================================================================
// PATIENT REGISTRY SERVICE
// Service layer that orchestrates patient business logic operations
// ============================================================================

import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { PersonalInformation } from '../../domain/value-objects/PersonalInformation'
import { ContactInformation } from '../../domain/value-objects/ContactInformation'
import { EmergencyContact } from '../../domain/value-objects/EmergencyContact'
import { InsuranceInformation } from '../../domain/value-objects/InsuranceInformation'
import { FullName } from '../../domain/value-objects/FullName'
import { Gender } from '../../domain/value-objects/Gender'
import { CPF } from '../../domain/value-objects/CPF'
import { RG } from '../../domain/value-objects/RG'
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber'
import { Email } from '../../domain/value-objects/Email'
import { Address } from '../../domain/value-objects/Address'
import { UserId } from '../../domain/value-objects/UserId'
import { 
  IPatientRepository, 
  CreatePatientData, 
  UpdatePatientData, 
  SearchCriteria, 
  PaginationOptions, 
  PaginatedResult 
} from '../../infrastructure/repositories/IPatientRepository'

// Request/Response DTOs for the service layer
export interface CreatePatientRequest {
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
      country?: string
    }
  }
  emergencyContact: {
    name: string
    relationship: string
    phone: string
    email?: string
  }
  insuranceInfo?: {
    provider?: string
    policyNumber?: string
    groupNumber?: string
    validUntil?: Date
  }
}

export interface UpdatePatientRequest {
  personalInfo?: Partial<CreatePatientRequest['personalInfo']>
  contactInfo?: Partial<CreatePatientRequest['contactInfo']>
  emergencyContact?: Partial<CreatePatientRequest['emergencyContact']>
  insuranceInfo?: Partial<CreatePatientRequest['insuranceInfo']>
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean
  potentialDuplicates: Patient[]
  confidence: 'high' | 'medium' | 'low'
  matchingFields: string[]
}

export interface MergePatientRequest {
  primaryPatientId: string
  duplicatePatientId: string
  mergeStrategy: {
    personalInfo: 'primary' | 'duplicate' | 'merge'
    contactInfo: 'primary' | 'duplicate' | 'merge'
    emergencyContact: 'primary' | 'duplicate' | 'merge'
    insuranceInfo: 'primary' | 'duplicate' | 'merge'
  }
}

export interface PatientRegistryError {
  code: string
  message: string
  field?: string
  details?: any
}

/**
 * Patient Registry Service
 * 
 * Orchestrates patient business logic operations including:
 * - Patient CRUD operations with validation
 * - Duplicate detection and merging
 * - Business rule enforcement
 * - Error handling and validation
 * 
 * Requirements: 1.1, 1.6, 6.3
 */
export class PatientRegistry {
  constructor(
    private patientRepository: IPatientRepository
  ) {}

  /**
   * Create a new patient with comprehensive validation and duplicate detection
   * @param request - Patient creation request
   * @param createdBy - ID of the user creating the patient
   * @returns Promise resolving to the created Patient entity
   * @throws PatientRegistryError if validation fails or duplicates are detected
   */
  async createPatient(request: CreatePatientRequest, createdBy: string): Promise<Patient> {
    try {
      // Step 1: Validate input data
      this.validateCreatePatientRequest(request)

      // Step 2: Check for duplicates
      const duplicateCheck = await this.detectDuplicates({
        fullName: request.personalInfo.fullName,
        dateOfBirth: request.personalInfo.dateOfBirth,
        cpf: request.personalInfo.cpf
      })

      if (duplicateCheck.isDuplicate && duplicateCheck.confidence === 'high') {
        const error = new Error('A patient with similar information already exists') as any
        error.code = 'DUPLICATE_PATIENT'
        error.details = {
          duplicates: duplicateCheck.potentialDuplicates.map(p => ({
            id: p.id.value,
            name: p.personalInfo.fullName.value,
            cpf: p.personalInfo.cpf.value
          }))
        }
        throw error
      }

      // Step 3: Create domain value objects
      const personalInfo = this.createPersonalInformation(request.personalInfo)
      const contactInfo = this.createContactInformation(request.contactInfo)
      const emergencyContact = this.createEmergencyContact(request.emergencyContact)
      const insuranceInfo = this.createInsuranceInformation(request.insuranceInfo)

      // Step 4: Map to repository format and create
      const createData: CreatePatientData = {
        personalInfo: {
          fullName: request.personalInfo.fullName,
          dateOfBirth: request.personalInfo.dateOfBirth,
          gender: request.personalInfo.gender,
          cpf: request.personalInfo.cpf,
          rg: request.personalInfo.rg
        },
        contactInfo: {
          primaryPhone: request.contactInfo.primaryPhone,
          secondaryPhone: request.contactInfo.secondaryPhone,
          email: request.contactInfo.email,
          address: {
            street: request.contactInfo.address.street,
            number: request.contactInfo.address.number,
            complement: request.contactInfo.address.complement,
            neighborhood: request.contactInfo.address.neighborhood,
            city: request.contactInfo.address.city,
            state: request.contactInfo.address.state,
            zipCode: request.contactInfo.address.zipCode,
            country: request.contactInfo.address.country || 'Brasil'
          }
        },
        emergencyContact: {
          name: request.emergencyContact.name,
          relationship: request.emergencyContact.relationship,
          phone: request.emergencyContact.phone,
          email: request.emergencyContact.email
        },
        insuranceInfo: {
          provider: request.insuranceInfo?.provider,
          policyNumber: request.insuranceInfo?.policyNumber,
          groupNumber: request.insuranceInfo?.groupNumber,
          validUntil: request.insuranceInfo?.validUntil
        }
      }

      return await this.patientRepository.create(createData, createdBy)
    } catch (error) {
      if (error instanceof Error && (error as any).code === 'VALIDATION_FAILED') {
        throw error
      }
      if (error instanceof Error && (error as any).code === 'DUPLICATE_PATIENT') {
        throw error
      }
      throw this.createError('CREATION_FAILED', 'Failed to create patient', { originalError: error })
    }
  }

  /**
   * Update an existing patient with validation
   * @param id - Patient ID
   * @param request - Update request
   * @returns Promise resolving to updated Patient entity
   */
  async updatePatient(id: string, request: UpdatePatientRequest): Promise<Patient> {
    try {
      let patientId: PatientId
      try {
        patientId = new PatientId(id)
      } catch (error) {
        const notFoundError = new Error(`Patient with ID ${id} not found`) as any
        notFoundError.code = 'PATIENT_NOT_FOUND'
        throw notFoundError
      }
      
      // Validate the patient exists
      const existingPatient = await this.patientRepository.findById(patientId)
      if (!existingPatient) {
        const error = new Error(`Patient with ID ${id} not found`) as any
        error.code = 'PATIENT_NOT_FOUND'
        throw error
      }

      // Validate update request
      this.validateUpdatePatientRequest(request)

      // Check for duplicates if CPF is being changed
      if (request.personalInfo?.cpf && request.personalInfo.cpf !== existingPatient.personalInfo.cpf.value) {
        const duplicateCheck = await this.detectDuplicates({
          fullName: request.personalInfo.fullName || existingPatient.personalInfo.fullName.value,
          dateOfBirth: request.personalInfo.dateOfBirth || existingPatient.personalInfo.dateOfBirth,
          cpf: request.personalInfo.cpf
        })

        if (duplicateCheck.isDuplicate && duplicateCheck.confidence === 'high') {
          const error = new Error('Another patient with this CPF already exists') as any
          error.code = 'DUPLICATE_PATIENT'
          throw error
        }
      }

      // Map to repository format
      const updateData: UpdatePatientData = {}

      if (request.personalInfo) {
        updateData.personalInfo = {
          fullName: request.personalInfo.fullName,
          dateOfBirth: request.personalInfo.dateOfBirth,
          gender: request.personalInfo.gender,
          cpf: request.personalInfo.cpf,
          rg: request.personalInfo.rg
        }
      }

      if (request.contactInfo) {
        updateData.contactInfo = {
          primaryPhone: request.contactInfo.primaryPhone,
          secondaryPhone: request.contactInfo.secondaryPhone,
          email: request.contactInfo.email
        }

        if (request.contactInfo.address) {
          updateData.contactInfo.address = {
            street: request.contactInfo.address.street,
            number: request.contactInfo.address.number,
            complement: request.contactInfo.address.complement,
            neighborhood: request.contactInfo.address.neighborhood,
            city: request.contactInfo.address.city,
            state: request.contactInfo.address.state,
            zipCode: request.contactInfo.address.zipCode,
            country: request.contactInfo.address.country || 'Brasil'
          }
        }
      }

      if (request.emergencyContact) {
        updateData.emergencyContact = {
          name: request.emergencyContact.name,
          relationship: request.emergencyContact.relationship,
          phone: request.emergencyContact.phone,
          email: request.emergencyContact.email
        }
      }

      if (request.insuranceInfo) {
        updateData.insuranceInfo = {
          provider: request.insuranceInfo.provider,
          policyNumber: request.insuranceInfo.policyNumber,
          groupNumber: request.insuranceInfo.groupNumber,
          validUntil: request.insuranceInfo.validUntil
        }
      }

      return await this.patientRepository.update(patientId, updateData)
    } catch (error) {
      if (error instanceof Error && (error as any).code === 'PATIENT_NOT_FOUND') {
        throw error
      }
      if (error instanceof Error && (error as any).code === 'VALIDATION_FAILED') {
        throw error
      }
      throw this.createError('UPDATE_FAILED', 'Failed to update patient', { originalError: error })
    }
  }

  /**
   * Get a patient by ID
   * @param id - Patient ID
   * @returns Promise resolving to Patient entity or null
   */
  async getPatient(id: string): Promise<Patient | null> {
    try {
      const patientId = new PatientId(id)
      return await this.patientRepository.findById(patientId)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Patient ID must be a valid UUID')) {
        return null // Invalid ID format returns null instead of throwing
      }
      throw this.createError('RETRIEVAL_FAILED', 'Failed to retrieve patient', { originalError: error })
    }
  }

  /**
   * Search patients with criteria and pagination
   * @param criteria - Search criteria
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated search results
   */
  async searchPatients(
    criteria: SearchCriteria,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    try {
      return await this.patientRepository.search(criteria, pagination)
    } catch (error) {
      throw this.createError('SEARCH_FAILED', 'Failed to search patients', { originalError: error })
    }
  }

  /**
   * Delete a patient
   * @param id - Patient ID
   * @returns Promise resolving when deletion is complete
   */
  async deletePatient(id: string): Promise<void> {
    try {
      let patientId: PatientId
      try {
        patientId = new PatientId(id)
      } catch (error) {
        const notFoundError = new Error(`Patient with ID ${id} not found`) as any
        notFoundError.code = 'PATIENT_NOT_FOUND'
        throw notFoundError
      }
      
      // Validate the patient exists
      const existingPatient = await this.patientRepository.findById(patientId)
      if (!existingPatient) {
        const error = new Error(`Patient with ID ${id} not found`) as any
        error.code = 'PATIENT_NOT_FOUND'
        throw error
      }

      await this.patientRepository.delete(patientId)
    } catch (error) {
      if (error instanceof Error && (error as any).code === 'PATIENT_NOT_FOUND') {
        throw error
      }
      throw this.createError('DELETION_FAILED', 'Failed to delete patient', { originalError: error })
    }
  }

  /**
   * Detect potential duplicate patients
   * @param personalInfo - Personal information to check
   * @returns Promise resolving to duplicate detection result
   */
  async detectDuplicates(personalInfo: {
    fullName: string
    dateOfBirth: Date
    cpf?: string
  }): Promise<DuplicateDetectionResult> {
    try {
      const potentialDuplicates = await this.patientRepository.findPotentialDuplicates(personalInfo)
      
      if (potentialDuplicates.length === 0) {
        return {
          isDuplicate: false,
          potentialDuplicates: [],
          confidence: 'low',
          matchingFields: []
        }
      }

      // Analyze matches to determine confidence level
      const analysis = this.analyzeDuplicates(personalInfo, potentialDuplicates)
      
      return {
        isDuplicate: analysis.confidence !== 'low',
        potentialDuplicates,
        confidence: analysis.confidence,
        matchingFields: analysis.matchingFields
      }
    } catch (error) {
      throw this.createError('DUPLICATE_DETECTION_FAILED', 'Failed to detect duplicates', { originalError: error })
    }
  }

  /**
   * Merge two patient records
   * @param request - Merge request with strategy
   * @returns Promise resolving to merged Patient entity
   */
  async mergePatients(request: MergePatientRequest): Promise<Patient> {
    try {
      let primaryId: PatientId
      let duplicateId: PatientId
      
      try {
        primaryId = new PatientId(request.primaryPatientId)
      } catch (error) {
        const notFoundError = new Error(`Primary patient with ID ${request.primaryPatientId} not found`) as any
        notFoundError.code = 'PATIENT_NOT_FOUND'
        throw notFoundError
      }
      
      try {
        duplicateId = new PatientId(request.duplicatePatientId)
      } catch (error) {
        const notFoundError = new Error(`Duplicate patient with ID ${request.duplicatePatientId} not found`) as any
        notFoundError.code = 'PATIENT_NOT_FOUND'
        throw notFoundError
      }

      // Get both patients
      const [primaryPatient, duplicatePatient] = await Promise.all([
        this.patientRepository.findById(primaryId),
        this.patientRepository.findById(duplicateId)
      ])

      if (!primaryPatient) {
        const error = new Error(`Primary patient with ID ${request.primaryPatientId} not found`) as any
        error.code = 'PATIENT_NOT_FOUND'
        throw error
      }

      if (!duplicatePatient) {
        const error = new Error(`Duplicate patient with ID ${request.duplicatePatientId} not found`) as any
        error.code = 'PATIENT_NOT_FOUND'
        throw error
      }

      // Create merged patient data based on strategy
      const mergedData = this.createMergedPatientData(primaryPatient, duplicatePatient, request.mergeStrategy)

      // Update primary patient with merged data
      const updatedPatient = await this.patientRepository.update(primaryId, mergedData)

      // Delete the duplicate patient
      await this.patientRepository.delete(duplicateId)

      return updatedPatient
    } catch (error) {
      if (error instanceof Error && (error as any).code === 'PATIENT_NOT_FOUND') {
        throw error
      }
      throw this.createError('MERGE_FAILED', 'Failed to merge patients', { originalError: error })
    }
  }

  // Private helper methods

  private validateCreatePatientRequest(request: CreatePatientRequest): void {
    const errors: PatientRegistryError[] = []

    // Validate personal information
    if (!request.personalInfo.fullName?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'Full name is required', 'personalInfo.fullName'))
    }

    if (!request.personalInfo.dateOfBirth) {
      errors.push(this.createError('VALIDATION_ERROR', 'Date of birth is required', 'personalInfo.dateOfBirth'))
    } else if (request.personalInfo.dateOfBirth > new Date()) {
      errors.push(this.createError('VALIDATION_ERROR', 'Date of birth cannot be in the future', 'personalInfo.dateOfBirth'))
    }

    if (!request.personalInfo.cpf?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'CPF is required', 'personalInfo.cpf'))
    } else {
      try {
        new CPF(request.personalInfo.cpf)
      } catch {
        errors.push(this.createError('VALIDATION_ERROR', 'Invalid CPF format', 'personalInfo.cpf'))
      }
    }

    // Validate contact information
    if (!request.contactInfo.primaryPhone?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'Primary phone is required', 'contactInfo.primaryPhone'))
    } else {
      try {
        new PhoneNumber(request.contactInfo.primaryPhone)
      } catch {
        errors.push(this.createError('VALIDATION_ERROR', 'Invalid phone number format', 'contactInfo.primaryPhone'))
      }
    }

    if (request.contactInfo.email) {
      try {
        new Email(request.contactInfo.email)
      } catch {
        errors.push(this.createError('VALIDATION_ERROR', 'Invalid email format', 'contactInfo.email'))
      }
    }

    // Validate address
    if (!request.contactInfo.address.street?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'Street is required', 'contactInfo.address.street'))
    }

    if (!request.contactInfo.address.city?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'City is required', 'contactInfo.address.city'))
    }

    if (!request.contactInfo.address.state?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'State is required', 'contactInfo.address.state'))
    }

    if (!request.contactInfo.address.zipCode?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'ZIP code is required', 'contactInfo.address.zipCode'))
    }

    // Validate emergency contact
    if (!request.emergencyContact.name?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'Emergency contact name is required', 'emergencyContact.name'))
    }

    if (!request.emergencyContact.phone?.trim()) {
      errors.push(this.createError('VALIDATION_ERROR', 'Emergency contact phone is required', 'emergencyContact.phone'))
    } else {
      try {
        new PhoneNumber(request.emergencyContact.phone)
      } catch {
        errors.push(this.createError('VALIDATION_ERROR', 'Invalid emergency contact phone format', 'emergencyContact.phone'))
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors[0].message) as any
      error.code = 'VALIDATION_FAILED'
      error.details = { errors }
      throw error
    }
  }

  private validateUpdatePatientRequest(request: UpdatePatientRequest): void {
    const errors: PatientRegistryError[] = []

    // Validate personal information if provided
    if (request.personalInfo) {
      if (request.personalInfo.fullName !== undefined && !request.personalInfo.fullName?.trim()) {
        errors.push(this.createError('VALIDATION_ERROR', 'Full name cannot be empty', 'personalInfo.fullName'))
      }

      if (request.personalInfo.dateOfBirth !== undefined) {
        if (!request.personalInfo.dateOfBirth) {
          errors.push(this.createError('VALIDATION_ERROR', 'Date of birth cannot be null', 'personalInfo.dateOfBirth'))
        } else if (request.personalInfo.dateOfBirth > new Date()) {
          errors.push(this.createError('VALIDATION_ERROR', 'Date of birth cannot be in the future', 'personalInfo.dateOfBirth'))
        }
      }

      if (request.personalInfo.cpf !== undefined) {
        if (!request.personalInfo.cpf?.trim()) {
          errors.push(this.createError('VALIDATION_ERROR', 'CPF cannot be empty', 'personalInfo.cpf'))
        } else {
          try {
            new CPF(request.personalInfo.cpf)
          } catch {
            errors.push(this.createError('VALIDATION_ERROR', 'Invalid CPF format', 'personalInfo.cpf'))
          }
        }
      }
    }

    // Validate contact information if provided
    if (request.contactInfo) {
      if (request.contactInfo.primaryPhone !== undefined && !request.contactInfo.primaryPhone?.trim()) {
        errors.push(this.createError('VALIDATION_ERROR', 'Primary phone cannot be empty', 'contactInfo.primaryPhone'))
      } else if (request.contactInfo.primaryPhone) {
        try {
          new PhoneNumber(request.contactInfo.primaryPhone)
        } catch {
          errors.push(this.createError('VALIDATION_ERROR', 'Invalid phone number format', 'contactInfo.primaryPhone'))
        }
      }

      if (request.contactInfo.email !== undefined && request.contactInfo.email) {
        try {
          new Email(request.contactInfo.email)
        } catch {
          errors.push(this.createError('VALIDATION_ERROR', 'Invalid email format', 'contactInfo.email'))
        }
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors[0].message) as any
      error.code = 'VALIDATION_FAILED'
      error.details = { errors }
      throw error
    }
  }

  private createPersonalInformation(data: CreatePatientRequest['personalInfo']): PersonalInformation {
    return new PersonalInformation(
      new FullName(data.fullName),
      data.dateOfBirth,
      new Gender(data.gender),
      new CPF(data.cpf),
      new RG(data.rg)
    )
  }

  private createContactInformation(data: CreatePatientRequest['contactInfo']): ContactInformation {
    return new ContactInformation(
      new PhoneNumber(data.primaryPhone),
      data.secondaryPhone ? new PhoneNumber(data.secondaryPhone) : null,
      data.email ? new Email(data.email) : null,
      new Address(
        data.address.street,
        data.address.number,
        data.address.complement,
        data.address.neighborhood,
        data.address.city,
        data.address.state,
        data.address.zipCode
      )
    )
  }

  private createEmergencyContact(data: CreatePatientRequest['emergencyContact']): EmergencyContact {
    return new EmergencyContact(
      new FullName(data.name),
      new PhoneNumber(data.phone),
      data.relationship
    )
  }

  private createInsuranceInformation(data?: CreatePatientRequest['insuranceInfo']): InsuranceInformation {
    return new InsuranceInformation(
      data?.provider || null,
      data?.policyNumber || null,
      data?.groupNumber || null,
      data?.validUntil || null
    )
  }

  private analyzeDuplicates(
    personalInfo: { fullName: string; dateOfBirth: Date; cpf?: string },
    potentialDuplicates: Patient[]
  ): { confidence: 'high' | 'medium' | 'low'; matchingFields: string[] } {
    let maxConfidence: 'high' | 'medium' | 'low' = 'low'
    let allMatchingFields: string[] = []

    for (const duplicate of potentialDuplicates) {
      const matchingFields: string[] = []

      // Exact CPF match = high confidence
      if (personalInfo.cpf) {
        const cleanSearchCpf = personalInfo.cpf.replace(/\D/g, '')
        const cleanPatientCpf = duplicate.personalInfo.cpf.value.replace(/\D/g, '')
        if (cleanPatientCpf === cleanSearchCpf) {
          matchingFields.push('cpf')
          maxConfidence = 'high'
        }
      }

      // Exact name and date of birth match = high confidence
      if (duplicate.personalInfo.fullName.value.toLowerCase() === personalInfo.fullName.toLowerCase() &&
          duplicate.personalInfo.dateOfBirth.getTime() === personalInfo.dateOfBirth.getTime()) {
        matchingFields.push('fullName', 'dateOfBirth')
        if (maxConfidence !== 'high') {
          maxConfidence = 'high'
        }
      }

      // Similar name and same date of birth = medium confidence
      if (this.isSimilarName(duplicate.personalInfo.fullName.value, personalInfo.fullName) &&
          duplicate.personalInfo.dateOfBirth.getTime() === personalInfo.dateOfBirth.getTime()) {
        matchingFields.push('similarName', 'dateOfBirth')
        if (maxConfidence === 'low') {
          maxConfidence = 'medium'
        }
      }

      allMatchingFields = [...allMatchingFields, ...matchingFields]
    }

    return {
      confidence: maxConfidence,
      matchingFields: [...new Set(allMatchingFields)]
    }
  }

  private isSimilarName(name1: string, name2: string): boolean {
    // Simple similarity check - can be enhanced with more sophisticated algorithms
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
    const normalized1 = normalize(name1)
    const normalized2 = normalize(name2)

    // Check if names contain similar words
    const words1 = normalized1.split(/\s+/)
    const words2 = normalized2.split(/\s+/)

    let matchingWords = 0
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || this.levenshteinDistance(word1, word2) <= 2) {
          matchingWords++
          break
        }
      }
    }

    return matchingWords >= Math.min(words1.length, words2.length) * 0.7
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  private createMergedPatientData(
    primary: Patient,
    duplicate: Patient,
    strategy: MergePatientRequest['mergeStrategy']
  ): UpdatePatientData {
    const mergedData: UpdatePatientData = {}

    // Merge personal information
    if (strategy.personalInfo !== 'primary') {
      const personalInfo = strategy.personalInfo === 'duplicate' 
        ? {
            fullName: duplicate.personalInfo.fullName.value,
            dateOfBirth: duplicate.personalInfo.dateOfBirth,
            gender: duplicate.personalInfo.gender.value,
            cpf: duplicate.personalInfo.cpf.value,
            rg: duplicate.personalInfo.rg.value
          }
        : {
            // Merge strategy: prefer non-empty values from duplicate
            fullName: duplicate.personalInfo.fullName.value || primary.personalInfo.fullName.value,
            dateOfBirth: duplicate.personalInfo.dateOfBirth || primary.personalInfo.dateOfBirth,
            gender: duplicate.personalInfo.gender.value || primary.personalInfo.gender.value,
            cpf: duplicate.personalInfo.cpf.value || primary.personalInfo.cpf.value,
            rg: duplicate.personalInfo.rg.value || primary.personalInfo.rg.value
          }

      mergedData.personalInfo = personalInfo
    }

    // Merge contact information
    if (strategy.contactInfo !== 'primary') {
      const contactInfo = strategy.contactInfo === 'duplicate'
        ? {
            primaryPhone: duplicate.contactInfo.primaryPhone.value,
            secondaryPhone: duplicate.contactInfo.secondaryPhone?.value,
            email: duplicate.contactInfo.email?.value
          }
        : {
            // Merge strategy: prefer non-empty values from duplicate
            primaryPhone: duplicate.contactInfo.primaryPhone.value || primary.contactInfo.primaryPhone.value,
            secondaryPhone: duplicate.contactInfo.secondaryPhone?.value || primary.contactInfo.secondaryPhone?.value,
            email: duplicate.contactInfo.email?.value || primary.contactInfo.email?.value
          }

      mergedData.contactInfo = contactInfo
    }

    // Merge emergency contact
    if (strategy.emergencyContact !== 'primary') {
      const emergencyContact = strategy.emergencyContact === 'duplicate'
        ? {
            name: duplicate.emergencyContact.name.value,
            phone: duplicate.emergencyContact.phone.value,
            relationship: duplicate.emergencyContact.relationship
          }
        : {
            // Merge strategy: prefer non-empty values from duplicate
            name: duplicate.emergencyContact.name.value || primary.emergencyContact.name.value,
            phone: duplicate.emergencyContact.phone.value || primary.emergencyContact.phone.value,
            relationship: duplicate.emergencyContact.relationship || primary.emergencyContact.relationship
          }

      mergedData.emergencyContact = emergencyContact
    }

    // Merge insurance information
    if (strategy.insuranceInfo !== 'primary') {
      const insuranceInfo = strategy.insuranceInfo === 'duplicate'
        ? {
            provider: duplicate.insuranceInfo.provider,
            policyNumber: duplicate.insuranceInfo.policyNumber,
            groupNumber: duplicate.insuranceInfo.groupNumber,
            validUntil: duplicate.insuranceInfo.validUntil
          }
        : {
            // Merge strategy: prefer non-empty values from duplicate
            provider: duplicate.insuranceInfo.provider || primary.insuranceInfo.provider,
            policyNumber: duplicate.insuranceInfo.policyNumber || primary.insuranceInfo.policyNumber,
            groupNumber: duplicate.insuranceInfo.groupNumber || primary.insuranceInfo.groupNumber,
            validUntil: duplicate.insuranceInfo.validUntil || primary.insuranceInfo.validUntil
          }

      mergedData.insuranceInfo = insuranceInfo
    }

    return mergedData
  }

  private createError(code: string, message: string, field?: string | any): PatientRegistryError {
    if (typeof field === 'string') {
      return { code, message, field }
    }
    return { code, message, details: field }
  }
}