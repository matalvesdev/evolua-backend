// ============================================================================
// ADVANCED SEARCH USAGE EXAMPLES
// Demonstrates how to use the advanced search capabilities
// ============================================================================

import { 
  AdvancedSearchService,
  SearchQueryBuilder,
  SearchQueryTemplates,
  SearchPerformanceOptimizer
} from '../application/services'
import { PatientStatus } from '../domain/value-objects/PatientStatus'
import { SupabasePatientRepository } from '../infrastructure/repositories/SupabasePatientRepository'
import { createClient } from '@supabase/supabase-js'

/**
 * Example: Basic advanced search with multiple criteria
 */
async function basicAdvancedSearch() {
  // Setup
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)

  // Build search criteria using the query builder
  const criteria = new SearchQueryBuilder()
    .withName('Silva')
    .withStatus(new PatientStatus('active'))
    .withAgeRange(18, 65)
    .withCity('São Paulo')
    .build()

  // Execute search with pagination
  const results = await searchService.search(criteria, {
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  })

  console.log('Search Results:')
  console.log(`- Total: ${results.total}`)
  console.log(`- Page: ${results.page}/${results.totalPages}`)
  console.log(`- Execution Time: ${results.metrics.executionTimeMs}ms`)
  console.log(`- Cache Hit: ${results.metrics.cacheHit}`)
  console.log(`- Query Complexity: ${results.metrics.queryComplexity}`)
  console.log(`- Patients:`, results.data.map(p => p.personalInfo.fullName.value))
}

/**
 * Example: Autocomplete search for patient names
 */
async function autocompleteSearch() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)

  // Get autocomplete suggestions as user types
  const suggestions = await searchService.getAutocompleteSuggestions(
    'Mar', // User typed "Mar"
    'name',
    10
  )

  console.log('Autocomplete Suggestions:')
  suggestions.forEach(suggestion => {
    console.log(`- ${suggestion.label} (${suggestion.type})`)
  })
}

/**
 * Example: Multi-status search
 */
async function multiStatusSearch() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)

  // Search for patients with multiple statuses
  const statuses = [
    new PatientStatus('active'),
    new PatientStatus('on_hold')
  ]

  const results = await searchService.searchByStatuses(statuses, {
    page: 1,
    limit: 50,
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  })

  console.log(`Found ${results.total} patients with active or on_hold status`)
}

/**
 * Example: Age range search
 */
async function ageRangeSearch() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)

  // Search for children (0-12 years old)
  const children = await searchService.searchByAgeRange(0, 12, {
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  })

  console.log(`Found ${children.total} children patients`)

  // Search for seniors (65+ years old)
  const seniors = await searchService.searchByAgeRange(65, undefined, {
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  })

  console.log(`Found ${seniors.total} senior patients`)
}

/**
 * Example: Date range search
 */
async function dateRangeSearch() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)

  // Search for patients created in the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentPatients = await searchService.searchByDateRange(
    thirtyDaysAgo,
    new Date(),
    'created',
    {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  )

  console.log(`Found ${recentPatients.total} patients created in the last 30 days`)
}

/**
 * Example: Using predefined query templates
 */
async function templateSearch() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)

  // Search for new patients in the last 7 days
  const newPatientsCriteria = SearchQueryTemplates.newPatientsInLastDays(7)
  const newPatients = await searchService.search(newPatientsCriteria, {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  console.log(`New patients in last 7 days: ${newPatients.total}`)

  // Search for active patients in a specific city
  const cityPatientsCriteria = SearchQueryTemplates.activeInCity('São Paulo')
  const cityPatients = await searchService.search(cityPatientsCriteria, {
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  })

  console.log(`Active patients in São Paulo: ${cityPatients.total}`)

  // Search for children
  const childrenCriteria = SearchQueryTemplates.byAgeGroup('child')
  const children = await searchService.search(childrenCriteria, {
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  })

  console.log(`Children patients: ${children.total}`)
}

/**
 * Example: Performance optimization
 */
async function performanceOptimization() {
  const optimizer = new SearchPerformanceOptimizer()

  // Build a complex search query
  const criteria = new SearchQueryBuilder()
    .withName('Silva')
    .withStatus(new PatientStatus('active'))
    .withAgeRange(18, 65)
    .withCity('São Paulo')
    .withState('SP')
    .withCreatedDateRange(new Date('2024-01-01'), new Date())
    .build()

  const pagination = {
    page: 1,
    limit: 50,
    sortBy: 'name' as const,
    sortOrder: 'asc' as const
  }

  // Analyze the query
  const recommendation = optimizer.analyzeQuery(criteria, pagination)
  console.log('Query Analysis:')
  console.log(`- Strategy: ${recommendation.strategy}`)
  console.log(`- Reason: ${recommendation.reason}`)
  console.log(`- Impact: ${recommendation.estimatedImpact}`)
  console.log('- Suggestions:')
  recommendation.suggestions.forEach(s => console.log(`  * ${s}`))

  // Generate execution plan
  const plan = optimizer.generateExecutionPlan(criteria, pagination)
  console.log('\nExecution Plan:')
  console.log(`- Use Cache: ${plan.useCache}`)
  console.log(`- Use Indexes: ${plan.useIndexes.join(', ')}`)
  console.log(`- Estimated Rows: ${plan.estimatedRows}`)
  console.log(`- Estimated Time: ${plan.estimatedTimeMs}ms`)

  // Calculate complexity score
  const complexity = optimizer.calculateComplexityScore(criteria)
  console.log(`\nQuery Complexity Score: ${complexity}/100`)

  // Get improvement suggestions
  const improvements = optimizer.suggestImprovements(criteria)
  if (improvements.length > 0) {
    console.log('\nImprovement Suggestions:')
    improvements.forEach(i => console.log(`- ${i}`))
  }

  // Optimize pagination
  const optimizedPagination = optimizer.optimizePagination(pagination)
  console.log('\nOptimized Pagination:')
  console.log(`- Page: ${optimizedPagination.page}`)
  console.log(`- Limit: ${optimizedPagination.limit}`)
  console.log(`- Sort By: ${optimizedPagination.sortBy}`)
  console.log(`- Sort Order: ${optimizedPagination.sortOrder}`)
}

/**
 * Example: Complex multi-criteria search with optimization
 */
async function complexSearchWithOptimization() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)
  const optimizer = new SearchPerformanceOptimizer()

  // Build complex criteria
  const criteria = new SearchQueryBuilder()
    .withName('Silva')
    .withStatuses(
      new PatientStatus('active'),
      new PatientStatus('on_hold')
    )
    .withAgeRange(25, 55)
    .withCity('São Paulo')
    .withState('SP')
    .withInsuranceStatus(true)
    .withCreatedDateRange(
      new Date('2024-01-01'),
      new Date()
    )
    .build()

  // Optimize pagination
  const pagination = optimizer.optimizePagination({
    page: 1,
    limit: 100, // Will be optimized to 20
    sortBy: 'name',
    sortOrder: 'asc'
  })

  // Analyze before executing
  const recommendation = optimizer.analyzeQuery(criteria, pagination)
  console.log(`Query Strategy: ${recommendation.strategy}`)
  console.log(`Estimated Impact: ${recommendation.estimatedImpact}`)

  // Execute search
  const results = await searchService.search(criteria, pagination)

  console.log('\nSearch Results:')
  console.log(`- Total: ${results.total}`)
  console.log(`- Returned: ${results.data.length}`)
  console.log(`- Execution Time: ${results.metrics.executionTimeMs}ms`)
  console.log(`- Cache Hit: ${results.metrics.cacheHit}`)
  console.log(`- Complexity: ${results.metrics.queryComplexity}`)
}

/**
 * Example: Cache management
 */
async function cacheManagement() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const repository = new SupabasePatientRepository(supabase, 'clinic-id', 'therapist-id')
  const searchService = new AdvancedSearchService(repository)

  // First search - will hit database
  const criteria = SearchQueryTemplates.activeInCity('São Paulo')
  const result1 = await searchService.search(criteria, {
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  })
  console.log(`First search - Cache Hit: ${result1.metrics.cacheHit}`)
  console.log(`Execution Time: ${result1.metrics.executionTimeMs}ms`)

  // Second search with same criteria - will hit cache
  const result2 = await searchService.search(criteria, {
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  })
  console.log(`Second search - Cache Hit: ${result2.metrics.cacheHit}`)
  console.log(`Execution Time: ${result2.metrics.executionTimeMs}ms`)

  // Get cache statistics
  const stats = searchService.getCacheStats()
  console.log('\nCache Statistics:')
  console.log(`- Size: ${stats.size}/${stats.maxSize}`)
  console.log(`- Hit Rate: ${stats.hitRate}`)

  // Clear cache
  searchService.clearCache()
  console.log('\nCache cleared')
}

// Export all examples
export {
  basicAdvancedSearch,
  autocompleteSearch,
  multiStatusSearch,
  ageRangeSearch,
  dateRangeSearch,
  templateSearch,
  performanceOptimization,
  complexSearchWithOptimization,
  cacheManagement
}
