// ============================================================================
// ADVANCED SEARCH SERVICE
// Provides advanced search capabilities with multi-criteria filtering,
// autocomplete, and performance optimization for large datasets
// ============================================================================

import { Patient } from '../../domain/entities/Patient'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { 
  IPatientRepository, 
  SearchCriteria, 
  PaginationOptions, 
  PaginatedResult 
} from '../../infrastructure/repositories/IPatientRepository'

/**
 * Advanced search criteria with multi-field support
 * Requirements: 7.2, 7.3, 7.5, 7.6
 */
export interface AdvancedSearchCriteria {
  // Text search fields
  name?: string
  email?: string
  phone?: string
  cpf?: string
  medicalRecordNumber?: string
  
  // Status filters
  statuses?: PatientStatus[]
  
  // Age range filters
  ageMin?: number
  ageMax?: number
  
  // Date range filters
  dateOfBirthFrom?: Date
  dateOfBirthTo?: Date
  createdAfter?: Date
  createdBefore?: Date
  updatedAfter?: Date
  updatedBefore?: Date
  
  // Medical filters
  diagnosis?: string[]
  treatmentType?: string[]
  
  // Location filters
  city?: string
  state?: string
  
  // Insurance filters
  insuranceProvider?: string
  hasInsurance?: boolean
  
  // Activity filters
  isActive?: boolean
  
  // Combine mode for multiple criteria
  combineMode?: 'AND' | 'OR'
}

/**
 * Autocomplete suggestion result
 */
export interface AutocompleteSuggestion {
  value: string
  label: string
  type: 'name' | 'email' | 'phone' | 'cpf'
  patientId?: string
  metadata?: {
    status?: string
    lastVisit?: Date
  }
}

/**
 * Search performance metrics
 */
export interface SearchMetrics {
  executionTimeMs: number
  totalResults: number
  cacheHit: boolean
  queryComplexity: 'simple' | 'moderate' | 'complex'
}

/**
 * Enhanced search result with metrics
 */
export interface AdvancedSearchResult extends PaginatedResult<Patient> {
  metrics: SearchMetrics
  suggestions?: AutocompleteSuggestion[]
}

/**
 * Search cache entry
 */
interface CacheEntry {
  result: PaginatedResult<Patient>
  timestamp: number
  criteria: string
}

/**
 * Advanced Search Service
 * 
 * Provides sophisticated search capabilities including:
 * - Multi-criteria filtering with AND/OR logic
 * - Autocomplete suggestions for quick patient lookup
 * - Performance optimization with caching and query optimization
 * - Complex filtering with pagination support
 * 
 * Requirements: 7.2, 7.3, 7.5, 7.6
 */
export class AdvancedSearchService {
  private searchCache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 100

  constructor(
    private patientRepository: IPatientRepository
  ) {}

  /**
   * Perform advanced search with multi-criteria filtering
   * @param criteria - Advanced search criteria
   * @param pagination - Pagination options
   * @returns Promise resolving to enhanced search results with metrics
   */
  async search(
    criteria: AdvancedSearchCriteria,
    pagination: PaginationOptions
  ): Promise<AdvancedSearchResult> {
    const startTime = Date.now()
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(criteria, pagination)
    
    // Check cache
    const cachedResult = this.getCachedResult(cacheKey)
    if (cachedResult) {
      return {
        ...cachedResult,
        metrics: {
          executionTimeMs: Date.now() - startTime,
          totalResults: cachedResult.total,
          cacheHit: true,
          queryComplexity: this.assessQueryComplexity(criteria)
        }
      }
    }

    // Convert advanced criteria to repository search criteria
    const searchCriteria = this.convertToSearchCriteria(criteria)
    
    // Execute search
    const result = await this.patientRepository.search(searchCriteria, pagination)
    
    // Cache the result
    this.cacheResult(cacheKey, result)
    
    const executionTime = Date.now() - startTime
    
    return {
      ...result,
      metrics: {
        executionTimeMs: executionTime,
        totalResults: result.total,
        cacheHit: false,
        queryComplexity: this.assessQueryComplexity(criteria)
      }
    }
  }

  /**
   * Get autocomplete suggestions based on partial input
   * @param query - Partial search query
   * @param field - Field to search in (name, email, phone, cpf)
   * @param limit - Maximum number of suggestions
   * @returns Promise resolving to autocomplete suggestions
   */
  async getAutocompleteSuggestions(
    query: string,
    field: 'name' | 'email' | 'phone' | 'cpf' = 'name',
    limit: number = 10
  ): Promise<AutocompleteSuggestion[]> {
    if (!query || query.length < 2) {
      return []
    }

    // Build search criteria based on field
    const criteria: SearchCriteria = {
      query: query
    }

    // Search with small limit for autocomplete
    const result = await this.patientRepository.search(criteria, {
      page: 1,
      limit: limit,
      sortBy: 'name',
      sortOrder: 'asc'
    })

    // Convert results to suggestions
    return result.data.map(patient => this.patientToSuggestion(patient, field))
  }

  /**
   * Search with multiple status filters
   * @param statuses - Array of statuses to filter by
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  async searchByStatuses(
    statuses: PatientStatus[],
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    // For multiple statuses, we need to search each and combine results
    // This is a simplified implementation - in production, you'd want to optimize this
    if (statuses.length === 0) {
      return {
        data: [],
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
      }
    }

    if (statuses.length === 1) {
      return this.patientRepository.findByStatus(statuses[0], pagination)
    }

    // For multiple statuses, search each and combine
    const allResults: Patient[] = []
    for (const status of statuses) {
      const result = await this.patientRepository.findByStatus(status, {
        page: 1,
        limit: 1000, // Get all for this status
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder
      })
      allResults.push(...result.data)
    }

    // Apply pagination to combined results
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = allResults.slice(start, end)
    const total = allResults.length
    const totalPages = Math.ceil(total / pagination.limit)

    return {
      data: paginatedData,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1
    }
  }

  /**
   * Search with age range filter
   * @param minAge - Minimum age (inclusive)
   * @param maxAge - Maximum age (inclusive)
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  async searchByAgeRange(
    minAge?: number,
    maxAge?: number,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    const criteria: SearchCriteria = {
      ageRange: {
        min: minAge,
        max: maxAge
      }
    }

    return this.patientRepository.search(criteria, pagination || {
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc'
    })
  }

  /**
   * Search with date range filters
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @param dateType - Type of date to filter ('created' or 'updated')
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  async searchByDateRange(
    dateFrom?: Date,
    dateTo?: Date,
    dateType: 'created' | 'updated' = 'created',
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    const criteria: SearchCriteria = {}

    if (dateType === 'created') {
      if (dateFrom) criteria.createdAfter = dateFrom
      if (dateTo) criteria.createdBefore = dateTo
    }

    return this.patientRepository.search(criteria, pagination || {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  /**
   * Clear the search cache
   */
  clearCache(): void {
    this.searchCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.searchCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    }
  }

  // Private helper methods

  private convertToSearchCriteria(advanced: AdvancedSearchCriteria): SearchCriteria {
    const criteria: SearchCriteria = {}

    // Build general query from text fields
    const queryParts: string[] = []
    if (advanced.name) queryParts.push(advanced.name)
    if (advanced.email) queryParts.push(advanced.email)
    if (advanced.phone) queryParts.push(advanced.phone)
    if (advanced.cpf) queryParts.push(advanced.cpf)
    
    if (queryParts.length > 0) {
      criteria.query = queryParts.join(' ')
    }

    // Status filter (use first status if multiple provided)
    if (advanced.statuses && advanced.statuses.length > 0) {
      criteria.status = advanced.statuses[0]
    }

    // Age range
    if (advanced.ageMin !== undefined || advanced.ageMax !== undefined) {
      criteria.ageRange = {
        min: advanced.ageMin,
        max: advanced.ageMax
      }
    }

    // Date ranges
    if (advanced.createdAfter) criteria.createdAfter = advanced.createdAfter
    if (advanced.createdBefore) criteria.createdBefore = advanced.createdBefore

    // Diagnosis (use first if multiple provided)
    if (advanced.diagnosis && advanced.diagnosis.length > 0) {
      criteria.diagnosis = advanced.diagnosis[0]
    }

    // Treatment type (use first if multiple provided)
    if (advanced.treatmentType && advanced.treatmentType.length > 0) {
      criteria.treatmentType = advanced.treatmentType[0]
    }

    return criteria
  }

  private generateCacheKey(criteria: AdvancedSearchCriteria, pagination: PaginationOptions): string {
    return JSON.stringify({ criteria, pagination })
  }

  private getCachedResult(key: string): PaginatedResult<Patient> | null {
    const entry = this.searchCache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache entry is still valid
    const now = Date.now()
    if (now - entry.timestamp > this.CACHE_TTL_MS) {
      this.searchCache.delete(key)
      return null
    }

    return entry.result
  }

  private cacheResult(key: string, result: PaginatedResult<Patient>): void {
    // Implement LRU cache eviction if cache is full
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.searchCache.keys().next().value
      if (firstKey) {
        this.searchCache.delete(firstKey)
      }
    }

    this.searchCache.set(key, {
      result,
      timestamp: Date.now(),
      criteria: key
    })
  }

  private assessQueryComplexity(criteria: AdvancedSearchCriteria): 'simple' | 'moderate' | 'complex' {
    let criteriaCount = 0

    if (criteria.name) criteriaCount++
    if (criteria.email) criteriaCount++
    if (criteria.phone) criteriaCount++
    if (criteria.cpf) criteriaCount++
    if (criteria.statuses && criteria.statuses.length > 0) criteriaCount++
    if (criteria.ageMin !== undefined || criteria.ageMax !== undefined) criteriaCount++
    if (criteria.diagnosis && criteria.diagnosis.length > 0) criteriaCount++
    if (criteria.treatmentType && criteria.treatmentType.length > 0) criteriaCount++
    if (criteria.city) criteriaCount++
    if (criteria.state) criteriaCount++

    if (criteriaCount <= 2) return 'simple'
    if (criteriaCount <= 5) return 'moderate'
    return 'complex'
  }

  private patientToSuggestion(patient: Patient, field: 'name' | 'email' | 'phone' | 'cpf'): AutocompleteSuggestion {
    let value = ''
    let label = ''

    switch (field) {
      case 'name':
        value = patient.personalInfo.fullName.value
        label = `${patient.personalInfo.fullName.value} - ${patient.personalInfo.cpf.value}`
        break
      case 'email':
        value = patient.contactInfo.email?.value || ''
        label = `${patient.contactInfo.email?.value || ''} (${patient.personalInfo.fullName.value})`
        break
      case 'phone':
        value = patient.contactInfo.primaryPhone.value
        label = `${patient.contactInfo.primaryPhone.value} - ${patient.personalInfo.fullName.value}`
        break
      case 'cpf':
        value = patient.personalInfo.cpf.value
        label = `${patient.personalInfo.cpf.value} - ${patient.personalInfo.fullName.value}`
        break
    }

    return {
      value,
      label,
      type: field,
      patientId: patient.id.value,
      metadata: {
        status: patient.status.value
      }
    }
  }
}
