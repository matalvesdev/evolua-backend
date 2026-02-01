// ============================================================================
// SEARCH PERFORMANCE OPTIMIZER
// Optimizes search queries for large datasets with indexing hints and
// query optimization strategies
// ============================================================================

import { AdvancedSearchCriteria } from './AdvancedSearchService'
import { PaginationOptions } from '../../infrastructure/repositories/IPatientRepository'

/**
 * Query optimization strategy
 */
export type OptimizationStrategy = 
  | 'index-scan'      // Use database indexes
  | 'full-scan'       // Full table scan
  | 'partition'       // Partition-based search
  | 'cache-first'     // Check cache before database
  | 'parallel'        // Parallel query execution

/**
 * Query optimization recommendation
 */
export interface OptimizationRecommendation {
  strategy: OptimizationStrategy
  reason: string
  estimatedImpact: 'high' | 'medium' | 'low'
  suggestions: string[]
}

/**
 * Query execution plan
 */
export interface QueryExecutionPlan {
  useCache: boolean
  useIndexes: string[]
  estimatedRows: number
  estimatedTimeMs: number
  optimizations: string[]
}

/**
 * Search Performance Optimizer
 * 
 * Analyzes search queries and provides optimization recommendations
 * for handling large datasets efficiently.
 * 
 * Requirements: 7.3, 7.6
 */
export class SearchPerformanceOptimizer {
  private readonly INDEX_FIELDS = ['cpf', 'email', 'phone', 'status', 'created_at', 'updated_at']
  private readonly OPTIMAL_PAGE_SIZE = 20
  private readonly MAX_PAGE_SIZE = 100

  /**
   * Analyze a search query and provide optimization recommendations
   */
  analyzeQuery(
    criteria: AdvancedSearchCriteria,
    pagination: PaginationOptions
  ): OptimizationRecommendation {
    const criteriaCount = this.countCriteria(criteria)
    const hasIndexedFields = this.hasIndexedFields(criteria)
    const pageSize = pagination.limit

    // Determine optimal strategy
    if (criteriaCount === 0) {
      return {
        strategy: 'full-scan',
        reason: 'No search criteria provided, full table scan required',
        estimatedImpact: 'high',
        suggestions: [
          'Add at least one search criterion to improve performance',
          'Consider using status or date range filters',
          'Implement pagination with reasonable page size'
        ]
      }
    }

    if (hasIndexedFields && criteriaCount <= 3) {
      return {
        strategy: 'index-scan',
        reason: 'Query uses indexed fields with moderate complexity',
        estimatedImpact: 'low',
        suggestions: [
          'Query is well-optimized for indexed fields',
          'Consider caching results for frequently used queries'
        ]
      }
    }

    if (criteriaCount > 5) {
      return {
        strategy: 'parallel',
        reason: 'Complex query with many criteria benefits from parallel execution',
        estimatedImpact: 'medium',
        suggestions: [
          'Break down complex queries into simpler sub-queries',
          'Use parallel execution for independent criteria',
          'Consider pre-filtering with indexed fields first'
        ]
      }
    }

    if (pageSize > this.MAX_PAGE_SIZE) {
      return {
        strategy: 'partition',
        reason: 'Large page size requires partitioned data access',
        estimatedImpact: 'high',
        suggestions: [
          `Reduce page size to ${this.OPTIMAL_PAGE_SIZE} for better performance`,
          'Use cursor-based pagination for large result sets',
          'Implement virtual scrolling on the client side'
        ]
      }
    }

    return {
      strategy: 'cache-first',
      reason: 'Moderate query complexity benefits from caching',
      estimatedImpact: 'medium',
      suggestions: [
        'Enable query result caching',
        'Set appropriate cache TTL based on data volatility',
        'Implement cache warming for common queries'
      ]
    }
  }

  /**
   * Generate a query execution plan
   */
  generateExecutionPlan(
    criteria: AdvancedSearchCriteria,
    pagination: PaginationOptions
  ): QueryExecutionPlan {
    const recommendation = this.analyzeQuery(criteria, pagination)
    const indexedFields = this.getIndexedFields(criteria)
    
    return {
      useCache: recommendation.strategy === 'cache-first' || recommendation.strategy === 'index-scan',
      useIndexes: indexedFields,
      estimatedRows: this.estimateResultSize(criteria),
      estimatedTimeMs: this.estimateExecutionTime(criteria, pagination),
      optimizations: recommendation.suggestions
    }
  }

  /**
   * Optimize pagination settings for better performance
   */
  optimizePagination(pagination: PaginationOptions): PaginationOptions {
    const optimized = { ...pagination }

    // Adjust page size if too large
    if (optimized.limit > this.MAX_PAGE_SIZE) {
      optimized.limit = this.OPTIMAL_PAGE_SIZE
    }

    // Ensure page size is reasonable
    if (optimized.limit < 1) {
      optimized.limit = this.OPTIMAL_PAGE_SIZE
    }

    // Default to name sorting if not specified
    if (!optimized.sortBy) {
      optimized.sortBy = 'name'
      optimized.sortOrder = 'asc'
    }

    return optimized
  }

  /**
   * Suggest query improvements
   */
  suggestImprovements(criteria: AdvancedSearchCriteria): string[] {
    const suggestions: string[] = []

    // Check for inefficient patterns
    if (this.hasWildcardSearch(criteria)) {
      suggestions.push('Wildcard searches are slow - consider using more specific criteria')
    }

    if (this.hasDateRangeWithoutIndex(criteria)) {
      suggestions.push('Date range queries without indexed fields may be slow')
    }

    if (this.hasTooManyCriteria(criteria)) {
      suggestions.push('Too many criteria may slow down the query - consider simplifying')
    }

    if (!this.hasIndexedFields(criteria)) {
      suggestions.push('Add at least one indexed field (CPF, email, phone, status) for better performance')
    }

    if (this.hasORLogic(criteria)) {
      suggestions.push('OR logic requires multiple scans - consider breaking into separate queries')
    }

    return suggestions
  }

  /**
   * Calculate query complexity score (0-100)
   */
  calculateComplexityScore(criteria: AdvancedSearchCriteria): number {
    let score = 0

    // Base score for each criterion
    score += this.countCriteria(criteria) * 10

    // Penalty for non-indexed fields
    if (!this.hasIndexedFields(criteria)) {
      score += 20
    }

    // Penalty for wildcard searches
    if (this.hasWildcardSearch(criteria)) {
      score += 15
    }

    // Penalty for OR logic
    if (this.hasORLogic(criteria)) {
      score += 10
    }

    // Penalty for multiple array criteria
    if (criteria.statuses && criteria.statuses.length > 1) score += 5
    if (criteria.diagnosis && criteria.diagnosis.length > 1) score += 5
    if (criteria.treatmentType && criteria.treatmentType.length > 1) score += 5

    return Math.min(score, 100)
  }

  /**
   * Determine if query should use cache
   */
  shouldUseCache(criteria: AdvancedSearchCriteria): boolean {
    const complexity = this.calculateComplexityScore(criteria)
    const hasVolatileFields = this.hasVolatileFields(criteria)

    // Use cache for complex queries without volatile fields
    return complexity > 30 && !hasVolatileFields
  }

  // Private helper methods

  private countCriteria(criteria: AdvancedSearchCriteria): number {
    let count = 0

    if (criteria.name) count++
    if (criteria.email) count++
    if (criteria.phone) count++
    if (criteria.cpf) count++
    if (criteria.medicalRecordNumber) count++
    if (criteria.statuses && criteria.statuses.length > 0) count++
    if (criteria.ageMin !== undefined || criteria.ageMax !== undefined) count++
    if (criteria.dateOfBirthFrom || criteria.dateOfBirthTo) count++
    if (criteria.createdAfter || criteria.createdBefore) count++
    if (criteria.updatedAfter || criteria.updatedBefore) count++
    if (criteria.diagnosis && criteria.diagnosis.length > 0) count++
    if (criteria.treatmentType && criteria.treatmentType.length > 0) count++
    if (criteria.city) count++
    if (criteria.state) count++
    if (criteria.insuranceProvider) count++
    if (criteria.hasInsurance !== undefined) count++
    if (criteria.isActive !== undefined) count++

    return count
  }

  private hasIndexedFields(criteria: AdvancedSearchCriteria): boolean {
    return !!(
      criteria.cpf ||
      criteria.email ||
      criteria.phone ||
      criteria.statuses ||
      criteria.createdAfter ||
      criteria.createdBefore ||
      criteria.updatedAfter ||
      criteria.updatedBefore
    )
  }

  private getIndexedFields(criteria: AdvancedSearchCriteria): string[] {
    const fields: string[] = []

    if (criteria.cpf) fields.push('cpf')
    if (criteria.email) fields.push('email')
    if (criteria.phone) fields.push('phone')
    if (criteria.statuses) fields.push('status')
    if (criteria.createdAfter || criteria.createdBefore) fields.push('created_at')
    if (criteria.updatedAfter || criteria.updatedBefore) fields.push('updated_at')

    return fields
  }

  private hasWildcardSearch(criteria: AdvancedSearchCriteria): boolean {
    return !!(
      (criteria.name && criteria.name.includes('*')) ||
      (criteria.email && criteria.email.includes('*'))
    )
  }

  private hasDateRangeWithoutIndex(criteria: AdvancedSearchCriteria): boolean {
    const hasDateRange = !!(
      criteria.dateOfBirthFrom ||
      criteria.dateOfBirthTo
    )
    const hasIndexedDateRange = !!(
      criteria.createdAfter ||
      criteria.createdBefore ||
      criteria.updatedAfter ||
      criteria.updatedBefore
    )

    return hasDateRange && !hasIndexedDateRange
  }

  private hasTooManyCriteria(criteria: AdvancedSearchCriteria): boolean {
    return this.countCriteria(criteria) > 7
  }

  private hasORLogic(criteria: AdvancedSearchCriteria): boolean {
    return criteria.combineMode === 'OR'
  }

  private hasVolatileFields(criteria: AdvancedSearchCriteria): boolean {
    // Fields that change frequently shouldn't be cached
    return !!(
      criteria.updatedAfter ||
      criteria.updatedBefore ||
      criteria.isActive !== undefined
    )
  }

  private estimateResultSize(criteria: AdvancedSearchCriteria): number {
    // Simple heuristic for estimating result size
    const criteriaCount = this.countCriteria(criteria)
    
    if (criteriaCount === 0) return 1000 // Assume large dataset
    if (criteriaCount === 1) return 500
    if (criteriaCount <= 3) return 100
    if (criteriaCount <= 5) return 50
    return 20
  }

  private estimateExecutionTime(
    criteria: AdvancedSearchCriteria,
    pagination: PaginationOptions
  ): number {
    const complexity = this.calculateComplexityScore(criteria)
    const pageSize = pagination.limit
    const hasIndexes = this.hasIndexedFields(criteria)

    let baseTime = 50 // Base 50ms

    // Add time based on complexity
    baseTime += complexity * 2

    // Add time based on page size
    baseTime += pageSize * 0.5

    // Reduce time if using indexes
    if (hasIndexes) {
      baseTime *= 0.5
    }

    return Math.round(baseTime)
  }
}
