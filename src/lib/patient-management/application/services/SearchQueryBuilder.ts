// ============================================================================
// SEARCH QUERY BUILDER
// Utility for building complex search queries with fluent API
// ============================================================================

import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { AdvancedSearchCriteria } from './AdvancedSearchService'

/**
 * Search Query Builder
 * 
 * Provides a fluent API for building complex search queries.
 * Supports method chaining for intuitive query construction.
 * 
 * Requirements: 7.2, 7.5, 7.6
 * 
 * @example
 * ```typescript
 * const criteria = new SearchQueryBuilder()
 *   .withName('Silva')
 *   .withStatus(PatientStatus.ACTIVE)
 *   .withAgeRange(18, 65)
 *   .withCity('São Paulo')
 *   .build()
 * ```
 */
export class SearchQueryBuilder {
  private criteria: AdvancedSearchCriteria = {}

  /**
   * Add name filter
   */
  withName(name: string): this {
    this.criteria.name = name
    return this
  }

  /**
   * Add email filter
   */
  withEmail(email: string): this {
    this.criteria.email = email
    return this
  }

  /**
   * Add phone filter
   */
  withPhone(phone: string): this {
    this.criteria.phone = phone
    return this
  }

  /**
   * Add CPF filter
   */
  withCpf(cpf: string): this {
    this.criteria.cpf = cpf
    return this
  }

  /**
   * Add medical record number filter
   */
  withMedicalRecordNumber(mrn: string): this {
    this.criteria.medicalRecordNumber = mrn
    return this
  }

  /**
   * Add single status filter
   */
  withStatus(status: PatientStatus): this {
    this.criteria.statuses = [status]
    return this
  }

  /**
   * Add multiple status filters
   */
  withStatuses(...statuses: PatientStatus[]): this {
    this.criteria.statuses = statuses
    return this
  }

  /**
   * Add age range filter
   */
  withAgeRange(min?: number, max?: number): this {
    this.criteria.ageMin = min
    this.criteria.ageMax = max
    return this
  }

  /**
   * Add minimum age filter
   */
  withMinAge(age: number): this {
    this.criteria.ageMin = age
    return this
  }

  /**
   * Add maximum age filter
   */
  withMaxAge(age: number): this {
    this.criteria.ageMax = age
    return this
  }

  /**
   * Add date of birth range filter
   */
  withDateOfBirthRange(from?: Date, to?: Date): this {
    this.criteria.dateOfBirthFrom = from
    this.criteria.dateOfBirthTo = to
    return this
  }

  /**
   * Add created date range filter
   */
  withCreatedDateRange(after?: Date, before?: Date): this {
    this.criteria.createdAfter = after
    this.criteria.createdBefore = before
    return this
  }

  /**
   * Add updated date range filter
   */
  withUpdatedDateRange(after?: Date, before?: Date): this {
    this.criteria.updatedAfter = after
    this.criteria.updatedBefore = before
    return this
  }

  /**
   * Add single diagnosis filter
   */
  withDiagnosis(diagnosis: string): this {
    this.criteria.diagnosis = [diagnosis]
    return this
  }

  /**
   * Add multiple diagnosis filters
   */
  withDiagnoses(...diagnoses: string[]): this {
    this.criteria.diagnosis = diagnoses
    return this
  }

  /**
   * Add single treatment type filter
   */
  withTreatmentType(treatmentType: string): this {
    this.criteria.treatmentType = [treatmentType]
    return this
  }

  /**
   * Add multiple treatment type filters
   */
  withTreatmentTypes(...treatmentTypes: string[]): this {
    this.criteria.treatmentType = treatmentTypes
    return this
  }

  /**
   * Add city filter
   */
  withCity(city: string): this {
    this.criteria.city = city
    return this
  }

  /**
   * Add state filter
   */
  withState(state: string): this {
    this.criteria.state = state
    return this
  }

  /**
   * Add insurance provider filter
   */
  withInsuranceProvider(provider: string): this {
    this.criteria.insuranceProvider = provider
    return this
  }

  /**
   * Filter by insurance status
   */
  withInsuranceStatus(hasInsurance: boolean): this {
    this.criteria.hasInsurance = hasInsurance
    return this
  }

  /**
   * Filter by active status
   */
  withActiveStatus(isActive: boolean): this {
    this.criteria.isActive = isActive
    return this
  }

  /**
   * Set combine mode for multiple criteria
   */
  withCombineMode(mode: 'AND' | 'OR'): this {
    this.criteria.combineMode = mode
    return this
  }

  /**
   * Build and return the search criteria
   */
  build(): AdvancedSearchCriteria {
    return { ...this.criteria }
  }

  /**
   * Reset the builder to start fresh
   */
  reset(): this {
    this.criteria = {}
    return this
  }

  /**
   * Clone the current builder state
   */
  clone(): SearchQueryBuilder {
    const builder = new SearchQueryBuilder()
    builder.criteria = { ...this.criteria }
    return builder
  }

  /**
   * Check if the builder has any criteria set
   */
  isEmpty(): boolean {
    return Object.keys(this.criteria).length === 0
  }

  /**
   * Get the number of criteria set
   */
  getCriteriaCount(): number {
    let count = 0
    
    if (this.criteria.name) count++
    if (this.criteria.email) count++
    if (this.criteria.phone) count++
    if (this.criteria.cpf) count++
    if (this.criteria.medicalRecordNumber) count++
    if (this.criteria.statuses && this.criteria.statuses.length > 0) count++
    if (this.criteria.ageMin !== undefined || this.criteria.ageMax !== undefined) count++
    if (this.criteria.dateOfBirthFrom || this.criteria.dateOfBirthTo) count++
    if (this.criteria.createdAfter || this.criteria.createdBefore) count++
    if (this.criteria.updatedAfter || this.criteria.updatedBefore) count++
    if (this.criteria.diagnosis && this.criteria.diagnosis.length > 0) count++
    if (this.criteria.treatmentType && this.criteria.treatmentType.length > 0) count++
    if (this.criteria.city) count++
    if (this.criteria.state) count++
    if (this.criteria.insuranceProvider) count++
    if (this.criteria.hasInsurance !== undefined) count++
    if (this.criteria.isActive !== undefined) count++
    
    return count
  }
}

/**
 * Predefined query templates for common search scenarios
 */
export class SearchQueryTemplates {
  /**
   * Search for active patients in a specific city
   */
  static activeInCity(city: string): AdvancedSearchCriteria {
    return new SearchQueryBuilder()
      .withActiveStatus(true)
      .withCity(city)
      .build()
  }

  /**
   * Search for patients by age group
   */
  static byAgeGroup(ageGroup: 'child' | 'teen' | 'adult' | 'senior'): AdvancedSearchCriteria {
    const builder = new SearchQueryBuilder()
    
    switch (ageGroup) {
      case 'child':
        return builder.withAgeRange(0, 12).build()
      case 'teen':
        return builder.withAgeRange(13, 17).build()
      case 'adult':
        return builder.withAgeRange(18, 64).build()
      case 'senior':
        return builder.withMinAge(65).build()
    }
  }

  /**
   * Search for new patients in the last N days
   */
  static newPatientsInLastDays(days: number): AdvancedSearchCriteria {
    const date = new Date()
    date.setDate(date.getDate() - days)
    
    return new SearchQueryBuilder()
      .withStatus(new PatientStatus('new'))
      .withCreatedDateRange(date, new Date())
      .build()
  }

  /**
   * Search for patients with insurance
   */
  static withInsurance(): AdvancedSearchCriteria {
    return new SearchQueryBuilder()
      .withInsuranceStatus(true)
      .build()
  }

  /**
   * Search for patients without insurance
   */
  static withoutInsurance(): AdvancedSearchCriteria {
    return new SearchQueryBuilder()
      .withInsuranceStatus(false)
      .build()
  }

  /**
   * Search for patients by specific diagnosis
   */
  static byDiagnosis(diagnosis: string): AdvancedSearchCriteria {
    return new SearchQueryBuilder()
      .withDiagnosis(diagnosis)
      .build()
  }

  /**
   * Search for patients by treatment type
   */
  static byTreatmentType(treatmentType: string): AdvancedSearchCriteria {
    return new SearchQueryBuilder()
      .withTreatmentType(treatmentType)
      .build()
  }

  /**
   * Search for inactive patients
   */
  static inactive(): AdvancedSearchCriteria {
    return new SearchQueryBuilder()
      .withStatus(new PatientStatus('inactive'))
      .build()
  }

  /**
   * Search for patients on hold
   */
  static onHold(): AdvancedSearchCriteria {
    return new SearchQueryBuilder()
      .withStatus(new PatientStatus('on_hold'))
      .build()
  }
}
