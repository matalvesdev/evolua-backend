// ============================================================================
// SEARCH PERFORMANCE OPTIMIZER TESTS
// Unit tests for search performance optimization
// ============================================================================

import { SearchPerformanceOptimizer } from '../../../application/services/SearchPerformanceOptimizer'
import { SearchQueryBuilder } from '../../../application/services/SearchQueryBuilder'
import { PatientStatus } from '../../../domain/value-objects/PatientStatus'

describe('SearchPerformanceOptimizer', () => {
  let optimizer: SearchPerformanceOptimizer

  beforeEach(() => {
    optimizer = new SearchPerformanceOptimizer()
  })

  describe('analyzeQuery', () => {
    it('should recommend full-scan for empty criteria', () => {
      const criteria = new SearchQueryBuilder().build()
      const pagination = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const recommendation = optimizer.analyzeQuery(criteria, pagination)
      expect(recommendation.strategy).toBe('full-scan')
      expect(recommendation.estimatedImpact).toBe('high')
    })

    it('should recommend index-scan for indexed fields', () => {
      const criteria = new SearchQueryBuilder()
        .withCpf('123.456.789-00')
        .build()
      const pagination = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const recommendation = optimizer.analyzeQuery(criteria, pagination)
      expect(recommendation.strategy).toBe('index-scan')
      expect(recommendation.estimatedImpact).toBe('low')
    })

    it('should recommend parallel for complex queries', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .withEmail('test@example.com')
        .withPhone('11987654321')
        .withStatus(new PatientStatus('active'))
        .withAgeRange(18, 65)
        .withCity('São Paulo')
        .build()
      const pagination = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const recommendation = optimizer.analyzeQuery(criteria, pagination)
      expect(recommendation.strategy).toBe('parallel')
    })

    it('should recommend partition for large page sizes', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .build()
      const pagination = {
        page: 1,
        limit: 150,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const recommendation = optimizer.analyzeQuery(criteria, pagination)
      expect(recommendation.strategy).toBe('partition')
      expect(recommendation.estimatedImpact).toBe('high')
    })

    it('should recommend cache-first for moderate queries', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .withCity('São Paulo')
        .build()
      const pagination = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const recommendation = optimizer.analyzeQuery(criteria, pagination)
      expect(recommendation.strategy).toBe('cache-first')
    })
  })

  describe('generateExecutionPlan', () => {
    it('should generate execution plan with cache recommendation', () => {
      const criteria = new SearchQueryBuilder()
        .withCpf('123.456.789-00')
        .build()
      const pagination = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const plan = optimizer.generateExecutionPlan(criteria, pagination)
      expect(plan.useCache).toBe(true)
      expect(plan.useIndexes).toContain('cpf')
      expect(plan.estimatedRows).toBeGreaterThan(0)
      expect(plan.estimatedTimeMs).toBeGreaterThan(0)
      expect(Array.isArray(plan.optimizations)).toBe(true)
    })

    it('should identify indexed fields in execution plan', () => {
      const criteria = new SearchQueryBuilder()
        .withEmail('test@example.com')
        .withPhone('11987654321')
        .build()
      const pagination = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const plan = optimizer.generateExecutionPlan(criteria, pagination)
      expect(plan.useIndexes).toContain('email')
      expect(plan.useIndexes).toContain('phone')
    })
  })

  describe('optimizePagination', () => {
    it('should reduce excessive page size', () => {
      const pagination = {
        page: 1,
        limit: 200,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const optimized = optimizer.optimizePagination(pagination)
      expect(optimized.limit).toBeLessThan(pagination.limit)
      expect(optimized.limit).toBe(20)
    })

    it('should set default sort if not specified', () => {
      const pagination = {
        page: 1,
        limit: 20
      }

      const optimized = optimizer.optimizePagination(pagination)
      expect(optimized.sortBy).toBe('name')
      expect(optimized.sortOrder).toBe('asc')
    })

    it('should handle invalid page size', () => {
      const pagination = {
        page: 1,
        limit: 0,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      const optimized = optimizer.optimizePagination(pagination)
      expect(optimized.limit).toBeGreaterThan(0)
    })
  })

  describe('suggestImprovements', () => {
    it('should suggest adding indexed fields', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .build()

      const suggestions = optimizer.suggestImprovements(criteria)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.includes('indexed field'))).toBe(true)
    })

    it('should not suggest improvements for optimized queries', () => {
      const criteria = new SearchQueryBuilder()
        .withCpf('123.456.789-00')
        .build()

      const suggestions = optimizer.suggestImprovements(criteria)
      // Should have fewer suggestions for optimized query
      expect(suggestions.length).toBeLessThanOrEqual(1)
    })
  })

  describe('calculateComplexityScore', () => {
    it('should return low score for empty criteria', () => {
      const criteria = new SearchQueryBuilder().build()
      const score = optimizer.calculateComplexityScore(criteria)
      expect(score).toBeLessThanOrEqual(20) // Empty criteria still gets penalty for no indexes
    })

    it('should return low score for simple criteria', () => {
      const criteria = new SearchQueryBuilder()
        .withCpf('123.456.789-00')
        .build()
      const score = optimizer.calculateComplexityScore(criteria)
      expect(score).toBeLessThan(30)
    })

    it('should return high score for complex criteria', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .withEmail('test@example.com')
        .withPhone('11987654321')
        .withStatus(new PatientStatus('active'))
        .withAgeRange(18, 65)
        .withCity('São Paulo')
        .withState('SP')
        .withDiagnosis('Aphasia')
        .build()
      const score = optimizer.calculateComplexityScore(criteria)
      expect(score).toBeGreaterThan(50)
    })

    it('should cap score at 100', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .withEmail('test@example.com')
        .withPhone('11987654321')
        .withCpf('123.456.789-00')
        .withMedicalRecordNumber('MRN-12345')
        .withStatuses(
          new PatientStatus('active'),
          new PatientStatus('on_hold'),
          new PatientStatus('new')
        )
        .withAgeRange(18, 65)
        .withCity('São Paulo')
        .withState('SP')
        .withDiagnoses('Aphasia', 'Dysarthria', 'Stuttering')
        .withTreatmentTypes('Speech Therapy', 'Language Therapy')
        .withInsuranceProvider('Unimed')
        .withCombineMode('OR')
        .build()
      const score = optimizer.calculateComplexityScore(criteria)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('shouldUseCache', () => {
    it('should recommend cache for complex non-volatile queries', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .withStatus(new PatientStatus('active'))
        .withAgeRange(18, 65)
        .withCity('São Paulo')
        .build()

      const shouldCache = optimizer.shouldUseCache(criteria)
      expect(shouldCache).toBe(true)
    })

    it('should not recommend cache for simple queries', () => {
      const criteria = new SearchQueryBuilder()
        .withCpf('123.456.789-00')
        .build()

      const shouldCache = optimizer.shouldUseCache(criteria)
      expect(shouldCache).toBe(false)
    })

    it('should not recommend cache for volatile queries', () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .withStatus(new PatientStatus('active'))
        .withUpdatedDateRange(new Date(), new Date())
        .build()

      const shouldCache = optimizer.shouldUseCache(criteria)
      expect(shouldCache).toBe(false)
    })
  })
})
