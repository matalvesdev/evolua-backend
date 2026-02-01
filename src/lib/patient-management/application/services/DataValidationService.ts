// ============================================================================
// DATA VALIDATION SERVICE
// Comprehensive data validation and integrity checking service
// Requirements: 6.1, 6.2, 6.4, 6.5, 6.6
// ============================================================================

import { IPatientRepository } from '../../infrastructure/repositories/IPatientRepository'
import { IMedicalRecordRepository } from '../../infrastructure/repositories/IMedicalRecordRepository'
import { IDocumentRepository } from '../../infrastructure/repositories/IDocumentRepository'
import { PatientId } from '../../domain/value-objects/PatientId'
import { MedicalRecordId } from '../../domain/value-objects/MedicalRecordId'
import { DocumentId } from '../../domain/entities/Document'
import { CPF } from '../../domain/value-objects/CPF'
import { Email } from '../../domain/value-objects/Email'
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber'

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  field: string
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Comprehensive validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fieldResults: FieldValidationResult[]
}

/**
 * Validation error with context
 */
export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'critical'
  suggestedFix?: string
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string
  message: string
  code: string
}

/**
 * Referential integrity check result
 */
export interface ReferentialIntegrityResult {
  isValid: boolean
  violations: ReferentialIntegrityViolation[]
}

/**
 * Referential integrity violation
 */
export interface ReferentialIntegrityViolation {
  entityType: string
  entityId: string
  referencedEntityType: string
  referencedEntityId: string
  violationType: 'missing_reference' | 'orphaned_record' | 'circular_reference'
  message: string
}

/**
 * Bulk validation result
 */
export interface BulkValidationResult {
  totalRecords: number
  validRecords: number
  invalidRecords: number
  errors: Array<{
    recordIndex: number
    recordData: any
    errors: ValidationError[]
  }>
  warnings: Array<{
    recordIndex: number
    recordData: any
    warnings: ValidationWarning[]
  }>
}

/**
 * Patient data for validation
 */
export interface PatientDataForValidation {
  personalInfo: {
    fullName: string
    dateOfBirth: Date | string
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
  insuranceInfo?: {
    provider?: string
    policyNumber?: string
    groupNumber?: string
    validUntil?: Date | string
  }
}

/**
 * Data Validation Service
 * 
 * Provides comprehensive data validation including:
 * - Field format validation
 * - Business rule validation
 * - Referential integrity checks
 * - Bulk data import validation
 * - Healthcare-specific validation rules
 */
export class DataValidationService {
  constructor(
    private readonly patientRepository: IPatientRepository,
    private readonly medicalRecordRepository: IMedicalRecordRepository,
    private readonly documentRepository: IDocumentRepository
  ) {}

  /**
   * Validate patient data comprehensively
   * Requirements: 6.1, 6.5
   */
  async validatePatientData(data: PatientDataForValidation): Promise<ValidationResult> {
    const fieldResults: FieldValidationResult[] = []
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate personal information
    const personalInfoResults = await this.validatePersonalInformation(data.personalInfo)
    fieldResults.push(...personalInfoResults.fieldResults)
    errors.push(...personalInfoResults.errors)
    warnings.push(...personalInfoResults.warnings)

    // Validate contact information
    const contactInfoResults = this.validateContactInformation(data.contactInfo)
    fieldResults.push(...contactInfoResults.fieldResults)
    errors.push(...contactInfoResults.errors)
    warnings.push(...contactInfoResults.warnings)

    // Validate emergency contact
    const emergencyContactResults = this.validateEmergencyContact(data.emergencyContact)
    fieldResults.push(...emergencyContactResults.fieldResults)
    errors.push(...emergencyContactResults.errors)
    warnings.push(...emergencyContactResults.warnings)

    // Validate insurance information if provided
    if (data.insuranceInfo) {
      const insuranceResults = this.validateInsuranceInformation(data.insuranceInfo)
      fieldResults.push(...insuranceResults.fieldResults)
      errors.push(...insuranceResults.errors)
      warnings.push(...insuranceResults.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldResults
    }
  }

  /**
   * Validate personal information fields
   * Requirements: 6.1, 6.5
   */
  private async validatePersonalInformation(personalInfo: PatientDataForValidation['personalInfo']): Promise<{
    fieldResults: FieldValidationResult[]
    errors: ValidationError[]
    warnings: ValidationWarning[]
  }> {
    const fieldResults: FieldValidationResult[] = []
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate full name
    const nameResult = this.validateFullName(personalInfo.fullName)
    fieldResults.push(nameResult)
    if (!nameResult.isValid) {
      errors.push(...nameResult.errors.map(err => ({
        field: 'personalInfo.fullName',
        message: err,
        code: 'INVALID_NAME',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid full name with at least first and last name'
      })))
    }

    // Validate date of birth
    const dobResult = this.validateDateOfBirth(personalInfo.dateOfBirth)
    fieldResults.push(dobResult)
    if (!dobResult.isValid) {
      errors.push(...dobResult.errors.map(err => ({
        field: 'personalInfo.dateOfBirth',
        message: err,
        code: 'INVALID_DATE_OF_BIRTH',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid date of birth in the past'
      })))
    }
    if (dobResult.warnings.length > 0) {
      warnings.push(...dobResult.warnings.map(warn => ({
        field: 'personalInfo.dateOfBirth',
        message: warn,
        code: 'DATE_OF_BIRTH_WARNING'
      })))
    }

    // Validate gender
    const genderResult = this.validateGender(personalInfo.gender)
    fieldResults.push(genderResult)
    if (!genderResult.isValid) {
      errors.push(...genderResult.errors.map(err => ({
        field: 'personalInfo.gender',
        message: err,
        code: 'INVALID_GENDER',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid gender value'
      })))
    }

    // Validate CPF
    const cpfResult = await this.validateCPF(personalInfo.cpf)
    fieldResults.push(cpfResult)
    if (!cpfResult.isValid) {
      errors.push(...cpfResult.errors.map(err => ({
        field: 'personalInfo.cpf',
        message: err,
        code: 'INVALID_CPF',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid Brazilian CPF number'
      })))
    }
    if (cpfResult.warnings.length > 0) {
      warnings.push(...cpfResult.warnings.map(warn => ({
        field: 'personalInfo.cpf',
        message: warn,
        code: 'CPF_WARNING'
      })))
    }

    // Validate RG
    const rgResult = this.validateRG(personalInfo.rg)
    fieldResults.push(rgResult)
    if (!rgResult.isValid) {
      errors.push(...rgResult.errors.map(err => ({
        field: 'personalInfo.rg',
        message: err,
        code: 'INVALID_RG',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid RG number'
      })))
    }

    return { fieldResults, errors, warnings }
  }

  /**
   * Validate contact information fields
   * Requirements: 6.1, 6.5
   */
  private validateContactInformation(contactInfo: PatientDataForValidation['contactInfo']): {
    fieldResults: FieldValidationResult[]
    errors: ValidationError[]
    warnings: ValidationWarning[]
  } {
    const fieldResults: FieldValidationResult[] = []
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate primary phone
    const primaryPhoneResult = this.validatePhoneNumber(contactInfo.primaryPhone, 'primary')
    fieldResults.push(primaryPhoneResult)
    if (!primaryPhoneResult.isValid) {
      errors.push(...primaryPhoneResult.errors.map(err => ({
        field: 'contactInfo.primaryPhone',
        message: err,
        code: 'INVALID_PRIMARY_PHONE',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid Brazilian phone number'
      })))
    }

    // Validate secondary phone if provided
    if (contactInfo.secondaryPhone) {
      const secondaryPhoneResult = this.validatePhoneNumber(contactInfo.secondaryPhone, 'secondary')
      fieldResults.push(secondaryPhoneResult)
      if (!secondaryPhoneResult.isValid) {
        errors.push(...secondaryPhoneResult.errors.map(err => ({
          field: 'contactInfo.secondaryPhone',
          message: err,
          code: 'INVALID_SECONDARY_PHONE',
          severity: 'error' as const,
          suggestedFix: 'Provide a valid Brazilian phone number or leave empty'
        })))
      }
    }

    // Validate email if provided
    if (contactInfo.email) {
      const emailResult = this.validateEmail(contactInfo.email)
      fieldResults.push(emailResult)
      if (!emailResult.isValid) {
        errors.push(...emailResult.errors.map(err => ({
          field: 'contactInfo.email',
          message: err,
          code: 'INVALID_EMAIL',
          severity: 'error' as const,
          suggestedFix: 'Provide a valid email address or leave empty'
        })))
      }
    }

    // Validate address
    const addressResult = this.validateAddress(contactInfo.address)
    fieldResults.push(addressResult)
    if (!addressResult.isValid) {
      errors.push(...addressResult.errors.map(err => ({
        field: 'contactInfo.address',
        message: err,
        code: 'INVALID_ADDRESS',
        severity: 'error' as const,
        suggestedFix: 'Provide complete address information'
      })))
    }

    return { fieldResults, errors, warnings }
  }

  /**
   * Validate emergency contact information
   * Requirements: 6.1, 6.5
   */
  private validateEmergencyContact(emergencyContact: PatientDataForValidation['emergencyContact']): {
    fieldResults: FieldValidationResult[]
    errors: ValidationError[]
    warnings: ValidationWarning[]
  } {
    const fieldResults: FieldValidationResult[] = []
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate emergency contact name
    const nameResult = this.validateFullName(emergencyContact.name)
    fieldResults.push({ ...nameResult, field: 'emergencyContact.name' })
    if (!nameResult.isValid) {
      errors.push(...nameResult.errors.map(err => ({
        field: 'emergencyContact.name',
        message: err,
        code: 'INVALID_EMERGENCY_CONTACT_NAME',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid name for emergency contact'
      })))
    }

    // Validate relationship
    const relationshipResult = this.validateRelationship(emergencyContact.relationship)
    fieldResults.push(relationshipResult)
    if (!relationshipResult.isValid) {
      errors.push(...relationshipResult.errors.map(err => ({
        field: 'emergencyContact.relationship',
        message: err,
        code: 'INVALID_RELATIONSHIP',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid relationship type'
      })))
    }

    // Validate emergency contact phone
    const phoneResult = this.validatePhoneNumber(emergencyContact.phone, 'emergency')
    fieldResults.push({ ...phoneResult, field: 'emergencyContact.phone' })
    if (!phoneResult.isValid) {
      errors.push(...phoneResult.errors.map(err => ({
        field: 'emergencyContact.phone',
        message: err,
        code: 'INVALID_EMERGENCY_PHONE',
        severity: 'error' as const,
        suggestedFix: 'Provide a valid phone number for emergency contact'
      })))
    }

    // Validate emergency contact email if provided
    if (emergencyContact.email) {
      const emailResult = this.validateEmail(emergencyContact.email)
      fieldResults.push({ ...emailResult, field: 'emergencyContact.email' })
      if (!emailResult.isValid) {
        errors.push(...emailResult.errors.map(err => ({
          field: 'emergencyContact.email',
          message: err,
          code: 'INVALID_EMERGENCY_EMAIL',
          severity: 'error' as const,
          suggestedFix: 'Provide a valid email address or leave empty'
        })))
      }
    }

    return { fieldResults, errors, warnings }
  }

  /**
   * Validate insurance information
   * Requirements: 6.1, 6.5
   */
  private validateInsuranceInformation(insuranceInfo: NonNullable<PatientDataForValidation['insuranceInfo']>): {
    fieldResults: FieldValidationResult[]
    errors: ValidationError[]
    warnings: ValidationWarning[]
  } {
    const fieldResults: FieldValidationResult[] = []
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate provider if provided
    if (insuranceInfo.provider) {
      const providerResult = this.validateInsuranceProvider(insuranceInfo.provider)
      fieldResults.push(providerResult)
      if (!providerResult.isValid) {
        errors.push(...providerResult.errors.map(err => ({
          field: 'insuranceInfo.provider',
          message: err,
          code: 'INVALID_INSURANCE_PROVIDER',
          severity: 'error' as const
        })))
      }
    }

    // Validate policy number if provided
    if (insuranceInfo.policyNumber) {
      const policyResult = this.validatePolicyNumber(insuranceInfo.policyNumber)
      fieldResults.push(policyResult)
      if (!policyResult.isValid) {
        errors.push(...policyResult.errors.map(err => ({
          field: 'insuranceInfo.policyNumber',
          message: err,
          code: 'INVALID_POLICY_NUMBER',
          severity: 'error' as const
        })))
      }
    }

    // Validate valid until date if provided
    if (insuranceInfo.validUntil) {
      const validUntilResult = this.validateInsuranceValidUntil(insuranceInfo.validUntil)
      fieldResults.push(validUntilResult)
      if (!validUntilResult.isValid) {
        errors.push(...validUntilResult.errors.map(err => ({
          field: 'insuranceInfo.validUntil',
          message: err,
          code: 'INVALID_INSURANCE_VALID_UNTIL',
          severity: 'error' as const
        })))
      }
      if (validUntilResult.warnings.length > 0) {
        warnings.push(...validUntilResult.warnings.map(warn => ({
          field: 'insuranceInfo.validUntil',
          message: warn,
          code: 'INSURANCE_EXPIRING_SOON'
        })))
      }
    }

    return { fieldResults, errors, warnings }
  }

  /**
   * Validate full name format
   * Requirements: 6.1, 6.5
   */
  private validateFullName(name: string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!name || name.trim().length === 0) {
      errors.push('Name cannot be empty')
    } else {
      const trimmedName = name.trim()
      
      // Check minimum length
      if (trimmedName.length < 3) {
        errors.push('Name must be at least 3 characters long')
      }

      // Check maximum length
      if (trimmedName.length > 255) {
        errors.push('Name cannot exceed 255 characters')
      }

      // Check for at least two parts (first and last name)
      const nameParts = trimmedName.split(/\s+/)
      if (nameParts.length < 2) {
        errors.push('Please provide both first and last name')
      }

      // Check for invalid characters
      if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedName)) {
        errors.push('Name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed')
      }

      // Check for numbers
      if (/\d/.test(trimmedName)) {
        errors.push('Name cannot contain numbers')
      }

      // Warning for very short last name
      if (nameParts.length >= 2 && nameParts[nameParts.length - 1].length < 2) {
        warnings.push('Last name seems unusually short')
      }
    }

    return {
      field: 'fullName',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate date of birth
   * Requirements: 6.1, 6.5
   */
  private validateDateOfBirth(dob: Date | string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!dob) {
      errors.push('Date of birth is required')
      return { field: 'dateOfBirth', isValid: false, errors, warnings }
    }

    const dateOfBirth = typeof dob === 'string' ? new Date(dob) : dob

    // Check if valid date
    if (isNaN(dateOfBirth.getTime())) {
      errors.push('Invalid date format')
      return { field: 'dateOfBirth', isValid: false, errors, warnings }
    }

    // Check if date is in the past
    const now = new Date()
    if (dateOfBirth >= now) {
      errors.push('Date of birth must be in the past')
    }

    // Check if date is reasonable (not too far in the past)
    const maxAge = 150
    const minDate = new Date()
    minDate.setFullYear(minDate.getFullYear() - maxAge)
    if (dateOfBirth < minDate) {
      errors.push(`Date of birth cannot be more than ${maxAge} years ago`)
    }

    // Calculate age
    const age = Math.floor((now.getTime() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

    // Warning for minors
    if (age < 18) {
      warnings.push('Patient is a minor. Ensure guardian consent is obtained')
    }

    // Warning for very young patients
    if (age < 1) {
      warnings.push('Patient is less than 1 year old. Ensure appropriate pediatric protocols are followed')
    }

    // Warning for elderly patients
    if (age > 90) {
      warnings.push('Patient is over 90 years old. Ensure appropriate geriatric care protocols are followed')
    }

    return {
      field: 'dateOfBirth',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate gender
   * Requirements: 6.1, 6.5
   */
  private validateGender(gender: string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!gender || gender.trim().length === 0) {
      errors.push('Gender is required')
    } else {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say', 'masculino', 'feminino', 'outro', 'prefiro_nao_dizer']
      const normalizedGender = gender.toLowerCase().trim()
      
      if (!validGenders.includes(normalizedGender)) {
        errors.push('Invalid gender value. Must be one of: male, female, other, prefer_not_to_say')
      }
    }

    return {
      field: 'gender',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate CPF with duplicate check
   * Requirements: 6.1, 6.3, 6.5
   */
  private async validateCPF(cpf: string): Promise<FieldValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    if (!cpf || cpf.trim().length === 0) {
      errors.push('CPF is required')
      return { field: 'cpf', isValid: false, errors, warnings }
    }

    try {
      // Validate CPF format using value object
      new CPF(cpf)

      // Check for duplicate CPF in database
      const exists = await this.patientRepository.existsByCpf(cpf)
      if (exists) {
        warnings.push('A patient with this CPF already exists in the system')
      }
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message)
      } else {
        errors.push('Invalid CPF')
      }
    }

    return {
      field: 'cpf',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate RG
   * Requirements: 6.1, 6.5
   */
  private validateRG(rg: string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!rg || rg.trim().length === 0) {
      errors.push('RG is required')
    } else {
      const cleanRg = rg.replace(/\D/g, '')
      
      // RG should have between 7 and 9 digits
      if (cleanRg.length < 7 || cleanRg.length > 9) {
        errors.push('RG must have between 7 and 9 digits')
      }

      // Check for all same digits
      if (/^(\d)\1+$/.test(cleanRg)) {
        errors.push('RG cannot have all identical digits')
      }
    }

    return {
      field: 'rg',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate phone number
   * Requirements: 6.1, 6.5
   */
  private validatePhoneNumber(phone: string, type: 'primary' | 'secondary' | 'emergency'): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!phone || phone.trim().length === 0) {
      errors.push(`${type} phone number is required`)
      return { field: `${type}Phone`, isValid: false, errors, warnings }
    }

    try {
      // Validate phone format using value object
      new PhoneNumber(phone)
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message)
      } else {
        errors.push('Invalid phone number')
      }
    }

    return {
      field: `${type}Phone`,
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate email
   * Requirements: 6.1, 6.5
   */
  private validateEmail(email: string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!email || email.trim().length === 0) {
      // Email is optional, so empty is valid
      return { field: 'email', isValid: true, errors, warnings }
    }

    try {
      // Validate email format using value object
      new Email(email)
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message)
      } else {
        errors.push('Invalid email address')
      }
    }

    return {
      field: 'email',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate address
   * Requirements: 6.1, 6.5
   */
  private validateAddress(address: PatientDataForValidation['contactInfo']['address']): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields
    if (!address.street || address.street.trim().length === 0) {
      errors.push('Street is required')
    }

    if (!address.number || address.number.trim().length === 0) {
      errors.push('Street number is required')
    }

    if (!address.neighborhood || address.neighborhood.trim().length === 0) {
      errors.push('Neighborhood is required')
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push('City is required')
    }

    if (!address.state || address.state.trim().length === 0) {
      errors.push('State is required')
    } else {
      // Validate Brazilian state codes
      const validStates = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
      ]
      const stateUpper = address.state.toUpperCase().trim()
      if (!validStates.includes(stateUpper)) {
        errors.push('Invalid Brazilian state code')
      }
    }

    if (!address.zipCode || address.zipCode.trim().length === 0) {
      errors.push('ZIP code is required')
    } else {
      // Validate Brazilian ZIP code format (CEP)
      const cleanZipCode = address.zipCode.replace(/\D/g, '')
      if (cleanZipCode.length !== 8) {
        errors.push('ZIP code must have 8 digits')
      }
    }

    if (!address.country || address.country.trim().length === 0) {
      errors.push('Country is required')
    }

    return {
      field: 'address',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate relationship
   * Requirements: 6.1, 6.5
   */
  private validateRelationship(relationship: string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!relationship || relationship.trim().length === 0) {
      errors.push('Relationship is required')
    } else {
      const validRelationships = [
        'parent', 'spouse', 'sibling', 'child', 'guardian', 'friend', 'other',
        'pai', 'mãe', 'cônjuge', 'irmão', 'irmã', 'filho', 'filha', 'responsável', 'amigo', 'outro'
      ]
      const normalizedRelationship = relationship.toLowerCase().trim()
      
      if (!validRelationships.includes(normalizedRelationship)) {
        warnings.push('Unusual relationship type. Common values: parent, spouse, sibling, child, guardian')
      }
    }

    return {
      field: 'relationship',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate insurance provider
   * Requirements: 6.1, 6.5
   */
  private validateInsuranceProvider(provider: string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (provider && provider.trim().length > 0) {
      if (provider.trim().length < 2) {
        errors.push('Insurance provider name must be at least 2 characters')
      }

      if (provider.trim().length > 100) {
        errors.push('Insurance provider name cannot exceed 100 characters')
      }
    }

    return {
      field: 'insuranceProvider',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate policy number
   * Requirements: 6.1, 6.5
   */
  private validatePolicyNumber(policyNumber: string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (policyNumber && policyNumber.trim().length > 0) {
      if (policyNumber.trim().length < 3) {
        errors.push('Policy number must be at least 3 characters')
      }

      if (policyNumber.trim().length > 50) {
        errors.push('Policy number cannot exceed 50 characters')
      }
    }

    return {
      field: 'policyNumber',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate insurance valid until date
   * Requirements: 6.1, 6.5
   */
  private validateInsuranceValidUntil(validUntil: Date | string): FieldValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!validUntil) {
      return { field: 'insuranceValidUntil', isValid: true, errors, warnings }
    }

    const validUntilDate = typeof validUntil === 'string' ? new Date(validUntil) : validUntil

    // Check if valid date
    if (isNaN(validUntilDate.getTime())) {
      errors.push('Invalid date format for insurance valid until')
      return { field: 'insuranceValidUntil', isValid: false, errors, warnings }
    }

    // Check if date is in the future
    const now = new Date()
    if (validUntilDate < now) {
      warnings.push('Insurance policy has expired')
    }

    // Warning if expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    if (validUntilDate < thirtyDaysFromNow && validUntilDate >= now) {
      warnings.push('Insurance policy is expiring within 30 days')
    }

    return {
      field: 'insuranceValidUntil',
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check referential integrity across entities
   * Requirements: 6.2
   */
  async checkReferentialIntegrity(patientId: PatientId): Promise<ReferentialIntegrityResult> {
    const violations: ReferentialIntegrityViolation[] = []

    try {
      // Check if patient exists
      const patient = await this.patientRepository.findById(patientId)
      if (!patient) {
        violations.push({
          entityType: 'Patient',
          entityId: patientId.value,
          referencedEntityType: 'N/A',
          referencedEntityId: 'N/A',
          violationType: 'missing_reference',
          message: 'Patient does not exist'
        })
        return { isValid: false, violations }
      }

      // Check medical records referential integrity
      const medicalRecords = await this.medicalRecordRepository.findByPatientId(patientId)
      for (const record of medicalRecords) {
        // Verify the medical record's patient reference is valid
        if (record.patientId.value !== patientId.value) {
          violations.push({
            entityType: 'MedicalRecord',
            entityId: record.id.value,
            referencedEntityType: 'Patient',
            referencedEntityId: record.patientId.value,
            violationType: 'missing_reference',
            message: 'Medical record references non-existent or mismatched patient'
          })
        }
      }

      // Check documents referential integrity
      const documents = await this.documentRepository.findByPatientId(patientId, { page: 1, limit: 1000 })
      for (const document of documents.data) {
        // Verify the document's patient reference is valid
        if (document.patientId.value !== patientId.value) {
          violations.push({
            entityType: 'Document',
            entityId: document.id.value,
            referencedEntityType: 'Patient',
            referencedEntityId: document.patientId.value,
            violationType: 'missing_reference',
            message: 'Document references non-existent or mismatched patient'
          })
        }
      }

    } catch (error) {
      violations.push({
        entityType: 'System',
        entityId: 'N/A',
        referencedEntityType: 'N/A',
        referencedEntityId: 'N/A',
        violationType: 'missing_reference',
        message: `Error checking referential integrity: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Check for orphaned medical records (records without valid patient)
   * Requirements: 6.2
   */
  async checkOrphanedMedicalRecords(medicalRecordId: MedicalRecordId): Promise<ReferentialIntegrityResult> {
    const violations: ReferentialIntegrityViolation[] = []

    try {
      const medicalRecord = await this.medicalRecordRepository.findById(medicalRecordId)
      
      if (!medicalRecord) {
        violations.push({
          entityType: 'MedicalRecord',
          entityId: medicalRecordId.value,
          referencedEntityType: 'N/A',
          referencedEntityId: 'N/A',
          violationType: 'missing_reference',
          message: 'Medical record does not exist'
        })
        return { isValid: false, violations }
      }

      // Check if referenced patient exists
      const patient = await this.patientRepository.findById(medicalRecord.patientId)
      if (!patient) {
        violations.push({
          entityType: 'MedicalRecord',
          entityId: medicalRecordId.value,
          referencedEntityType: 'Patient',
          referencedEntityId: medicalRecord.patientId.value,
          violationType: 'orphaned_record',
          message: 'Medical record references non-existent patient'
        })
      }
    } catch (error) {
      violations.push({
        entityType: 'System',
        entityId: 'N/A',
        referencedEntityType: 'N/A',
        referencedEntityId: 'N/A',
        violationType: 'missing_reference',
        message: `Error checking orphaned records: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Check for orphaned documents (documents without valid patient)
   * Requirements: 6.2
   */
  async checkOrphanedDocuments(documentId: DocumentId): Promise<ReferentialIntegrityResult> {
    const violations: ReferentialIntegrityViolation[] = []

    try {
      const document = await this.documentRepository.findById(documentId)
      
      if (!document) {
        violations.push({
          entityType: 'Document',
          entityId: documentId.value,
          referencedEntityType: 'N/A',
          referencedEntityId: 'N/A',
          violationType: 'missing_reference',
          message: 'Document does not exist'
        })
        return { isValid: false, violations }
      }

      // Check if referenced patient exists
      const patient = await this.patientRepository.findById(document.patientId)
      if (!patient) {
        violations.push({
          entityType: 'Document',
          entityId: documentId.value,
          referencedEntityType: 'Patient',
          referencedEntityId: document.patientId.value,
          violationType: 'orphaned_record',
          message: 'Document references non-existent patient'
        })
      }
    } catch (error) {
      violations.push({
        entityType: 'System',
        entityId: 'N/A',
        referencedEntityType: 'N/A',
        referencedEntityId: 'N/A',
        violationType: 'missing_reference',
        message: `Error checking orphaned documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Validate bulk patient data import
   * Requirements: 6.4
   */
  async validateBulkPatientData(patientDataArray: PatientDataForValidation[]): Promise<BulkValidationResult> {
    const errors: Array<{ recordIndex: number; recordData: any; errors: ValidationError[] }> = []
    const warnings: Array<{ recordIndex: number; recordData: any; warnings: ValidationWarning[] }> = []
    let validRecords = 0

    for (let i = 0; i < patientDataArray.length; i++) {
      const patientData = patientDataArray[i]
      
      try {
        const validationResult = await this.validatePatientData(patientData)
        
        if (validationResult.isValid) {
          validRecords++
        } else {
          errors.push({
            recordIndex: i,
            recordData: patientData,
            errors: validationResult.errors
          })
        }

        if (validationResult.warnings.length > 0) {
          warnings.push({
            recordIndex: i,
            recordData: patientData,
            warnings: validationResult.warnings
          })
        }
      } catch (error) {
        errors.push({
          recordIndex: i,
          recordData: patientData,
          errors: [{
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown validation error',
            code: 'VALIDATION_ERROR',
            severity: 'critical'
          }]
        })
      }
    }

    return {
      totalRecords: patientDataArray.length,
      validRecords,
      invalidRecords: patientDataArray.length - validRecords,
      errors,
      warnings
    }
  }

  /**
   * Validate business rules for patient data
   * Requirements: 6.1, 6.5
   */
  async validateBusinessRules(patientData: PatientDataForValidation): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const fieldResults: FieldValidationResult[] = []

    // Business Rule: Emergency contact cannot be the same as patient
    if (patientData.personalInfo.fullName.toLowerCase().trim() === 
        patientData.emergencyContact.name.toLowerCase().trim()) {
      warnings.push({
        field: 'emergencyContact.name',
        message: 'Emergency contact appears to be the same person as the patient',
        code: 'SAME_EMERGENCY_CONTACT'
      })
    }

    // Business Rule: Emergency contact phone should be different from patient phone
    const cleanPatientPhone = patientData.contactInfo.primaryPhone.replace(/\D/g, '')
    const cleanEmergencyPhone = patientData.emergencyContact.phone.replace(/\D/g, '')
    if (cleanPatientPhone === cleanEmergencyPhone) {
      warnings.push({
        field: 'emergencyContact.phone',
        message: 'Emergency contact phone is the same as patient primary phone',
        code: 'SAME_EMERGENCY_PHONE'
      })
    }

    // Business Rule: Check for potential duplicate patients
    try {
      const dateOfBirth = typeof patientData.personalInfo.dateOfBirth === 'string' 
        ? new Date(patientData.personalInfo.dateOfBirth) 
        : patientData.personalInfo.dateOfBirth

      const potentialDuplicates = await this.patientRepository.findPotentialDuplicates({
        fullName: patientData.personalInfo.fullName,
        dateOfBirth,
        cpf: patientData.personalInfo.cpf
      })

      if (potentialDuplicates.length > 0) {
        warnings.push({
          field: 'general',
          message: `Found ${potentialDuplicates.length} potential duplicate patient(s) with similar information`,
          code: 'POTENTIAL_DUPLICATE'
        })
      }
    } catch (error) {
      // Log error but don't fail validation
      console.error('Error checking for duplicates:', error)
    }

    // Business Rule: Insurance policy should not be expired for active patients
    if (patientData.insuranceInfo?.validUntil) {
      const validUntilDate = typeof patientData.insuranceInfo.validUntil === 'string'
        ? new Date(patientData.insuranceInfo.validUntil)
        : patientData.insuranceInfo.validUntil

      if (validUntilDate < new Date()) {
        warnings.push({
          field: 'insuranceInfo.validUntil',
          message: 'Insurance policy has expired',
          code: 'EXPIRED_INSURANCE'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldResults
    }
  }

  /**
   * Get validation summary for reporting
   * Requirements: 6.6
   */
  getValidationSummary(validationResult: ValidationResult): string {
    const summary: string[] = []

    summary.push(`Validation Result: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`)
    summary.push(`Total Errors: ${validationResult.errors.length}`)
    summary.push(`Total Warnings: ${validationResult.warnings.length}`)

    if (validationResult.errors.length > 0) {
      summary.push('\nErrors:')
      validationResult.errors.forEach((error, index) => {
        summary.push(`  ${index + 1}. [${error.field}] ${error.message}`)
        if (error.suggestedFix) {
          summary.push(`     Suggested Fix: ${error.suggestedFix}`)
        }
      })
    }

    if (validationResult.warnings.length > 0) {
      summary.push('\nWarnings:')
      validationResult.warnings.forEach((warning, index) => {
        summary.push(`  ${index + 1}. [${warning.field}] ${warning.message}`)
      })
    }

    return summary.join('\n')
  }
}
