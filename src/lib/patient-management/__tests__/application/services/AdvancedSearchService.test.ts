// ============================================================================
// ADVANCED SEARCH SERVICE TESTS
// Unit tests for advanced search capabilities
// ============================================================================

import { AdvancedSearchService } from '../../../application/services/AdvancedSearchService'
import { SearchQueryBuilder } from '../../../application/services/SearchQueryBuilder'
import { IPatientRepository, PaginatedResult } from '../../../infrastructure/repositories/IPatientRepository'
import { Patient } from '../../../domain/entities/Patient'
import { PatientStatus } from '../../../domain/value-objects/PatientStatus'

// Mock repository
class MockPatientRepository implements Partial<IPatientRepository> {
  async search(): Promise<PaginatedResult<Patient>> {
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    }
  }

  async findByStatus(): Promise<PaginatedResult<Patient>> {
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    }
  }
}

describe('AdvancedSearchService', () => {
  let service: AdvancedSearchService
  let mockRepository: MockPatientRepository

  beforeEach(() => {
    mockRepository = new MockPatientRepository()
    service = new AdvancedSearchService(mockRepository as IPatientRepository)
  })

  describe('search', () => {
    it('should execute search with basic criteria', async () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .build()

      const result = await service.search(criteria, {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      })

      expect(result).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(result.metrics.cacheHit).toBe(false)
    })

    it('should return cached results on second search', async () => {
      const criteria = new SearchQueryBuilder()
        .withName('Silva')
        .build()

      const pagination = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      }

      // First search
      const result1 = await service.search(criteria, pagination)
      expect(result1.metrics.cacheHit).toBe(false)

      // Second search with same criteria
      const result2 = await service.search(criteria, pagination)
      expect(result2.metrics.cacheHit).toBe(true)
    })

    it('should assess query complexity correctly', async () => {
      const simpleCriteria = new SearchQueryBuilder()
        .withName('Silva')
        .build()

      const simpleResult = await service.search(simpleCriteria, {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      })

      expect(simpleResult.metrics.queryComplexity).toBe('simple')

      const complexCriteria = new SearchQueryBuilder()
        .withName('Silva')
        .withEmail('test@example.com')
        .withPhone('11987654321')
        .withStatus(new PatientStatus('active'))
        .withAgeRange(18, 65)
        .withCity('São Paulo')
        .build()

      const complexResult = await service.search(complexCriteria, {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      })

      expect(complexResult.metrics.queryComplexity).toBe('complex')
    })
  })

  describe('getAutocompleteSuggestions', () => {
    it('should return empty array for short queries', async () => {
      const suggestions = await service.getAutocompleteSuggestions('a', 'name', 10)
      expect(suggestions).toEqual([])
    })

    it('should return suggestions for valid queries', async () => {
      const suggestions = await service.getAutocompleteSuggestions('Mar', 'name', 10)
      expect(suggestions).toBeDefined()
      expect(Array.isArray(suggestions)).toBe(true)
    })
  })

  describe('searchByStatuses', () => {
    it('should return empty result for no statuses', async () => {
      const result = await service.searchByStatuses([], {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      })

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should search single status', async () => {
      const result = await service.searchByStatuses(
        [new PatientStatus('active')],
        {
          page: 1,
          limit: 20,
          sortBy: 'name',
          sortOrder: 'asc'
        }
      )

      expect(result).toBeDefined()
    })
  })

  describe('searchByAgeRange', () => {
    it('should search with minimum age only', async () => {
      const result = await service.searchByAgeRange(18, undefined)
      expect(result).toBeDefined()
    })

    it('should search with maximum age only', async () => {
      const result = await service.searchByAgeRange(undefined, 65)
      expect(result).toBeDefined()
    })

    it('should search with age range', async () => {
      const result = await service.searchByAgeRange(18, 65)
      expect(result).toBeDefined()
    })
  })

  describe('searchByDateRange', () => {
    it('should search by created date range', async () => {
      const from = new Date('2024-01-01')
      const to = new Date('2024-12-31')

      const result = await service.searchByDateRange(from, to, 'created')
      expect(result).toBeDefined()
    })

    it('should search with date from only', async () => {
      const from = new Date('2024-01-01')

      const result = await service.searchByDateRange(from, undefined, 'created')
      expect(result).toBeDefined()
    })
  })

  describe('cache management', () => {
    it('should clear cache', () => {
      service.clearCache()
      const stats = service.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should return cache statistics', () => {
      const stats = service.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('hitRate')
    })
  })
})
