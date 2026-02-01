# Advanced Search System

## Overview

The Advanced Search System provides sophisticated search capabilities for the Patient Management System, including multi-criteria filtering, autocomplete suggestions, and performance optimization for large datasets.

**Requirements Addressed:**
- 7.2: Filtering by status, age range, diagnosis, and treatment type
- 7.3: Autocomplete functionality for common search terms
- 7.5: Advanced search combinations with multiple criteria
- 7.6: Pagination and performance optimization for large result sets

## Components

### 1. AdvancedSearchService

The main service providing advanced search capabilities with caching and performance metrics.

**Key Features:**
- Multi-criteria search with complex filtering
- Autocomplete suggestions for quick patient lookup
- Search result caching (5-minute TTL, 100 entry limit)
- Performance metrics tracking
- Multiple status filtering
- Age range and date range searches

**Usage Example:**
```typescript
import { AdvancedSearchService, SearchQueryBuilder } from './services'
import { PatientStatus } from '../domain/value-objects/PatientStatus'

const searchService = new AdvancedSearchService(patientRepository)

// Build search criteria
const criteria = new SearchQueryBuilder()
  .withName('Silva')
  .withStatus(new PatientStatus('active'))
  .withAgeRange(18, 65)
  .withCity('São Paulo')
  .build()

// Execute search
const results = await searchService.search(criteria, {
  page: 1,
  limit: 20,
  sortBy: 'name',
  sortOrder: 'asc'
})

console.log(`Found ${results.total} patients`)
console.log(`Execution time: ${results.metrics.executionTimeMs}ms`)
console.log(`Cache hit: ${results.metrics.cacheHit}`)
```

### 2. SearchQueryBuilder

A fluent API for building complex search queries with method chaining.

**Key Features:**
- Intuitive method chaining interface
- Support for all search criteria types
- Query validation and counting
- Builder cloning and resetting

**Usage Example:**
```typescript
import { SearchQueryBuilder } from './services'

const criteria = new SearchQueryBuilder()
  .withName('Silva')
  .withStatus(new PatientStatus('active'))
  .withAgeRange(18, 65)
  .withCity('São Paulo')
  .withState('SP')
  .withInsuranceStatus(true)
  .withCreatedDateRange(new Date('2024-01-01'), new Date())
  .build()

// Check criteria count
const count = builder.getCriteriaCount()
console.log(`Query has ${count} criteria`)
```

### 3. SearchQueryTemplates

Predefined query templates for common search scenarios.

**Available Templates:**
- `activeInCity(city)` - Active patients in a specific city
- `byAgeGroup(group)` - Patients by age group (child, teen, adult, senior)
- `newPatientsInLastDays(days)` - New patients in the last N days
- `withInsurance()` - Patients with insurance
- `withoutInsurance()` - Patients without insurance
- `byDiagnosis(diagnosis)` - Patients by specific diagnosis
- `byTreatmentType(type)` - Patients by treatment type
- `inactive()` - Inactive patients
- `onHold()` - Patients on hold

**Usage Example:**
```typescript
import { SearchQueryTemplates } from './services'

// Search for new patients in the last 7 days
const criteria = SearchQueryTemplates.newPatientsInLastDays(7)
const results = await searchService.search(criteria, pagination)

// Search for children
const childrenCriteria = SearchQueryTemplates.byAgeGroup('child')
const children = await searchService.search(childrenCriteria, pagination)
```

### 4. SearchPerformanceOptimizer

Analyzes search queries and provides optimization recommendations for handling large datasets.

**Key Features:**
- Query complexity analysis
- Optimization strategy recommendations
- Execution plan generation
- Pagination optimization
- Query improvement suggestions
- Complexity scoring (0-100)

**Usage Example:**
```typescript
import { SearchPerformanceOptimizer } from './services'

const optimizer = new SearchPerformanceOptimizer()

// Analyze query
const recommendation = optimizer.analyzeQuery(criteria, pagination)
console.log(`Strategy: ${recommendation.strategy}`)
console.log(`Impact: ${recommendation.estimatedImpact}`)
console.log('Suggestions:', recommendation.suggestions)

// Generate execution plan
const plan = optimizer.generateExecutionPlan(criteria, pagination)
console.log(`Use cache: ${plan.useCache}`)
console.log(`Use indexes: ${plan.useIndexes.join(', ')}`)
console.log(`Estimated time: ${plan.estimatedTimeMs}ms`)

// Calculate complexity
const complexity = optimizer.calculateComplexityScore(criteria)
console.log(`Complexity score: ${complexity}/100`)

// Optimize pagination
const optimizedPagination = optimizer.optimizePagination(pagination)
```

## Search Criteria

### Text Search Fields
- `name` - Patient name (fuzzy search)
- `email` - Email address
- `phone` - Phone number
- `cpf` - CPF (Brazilian ID)
- `medicalRecordNumber` - Medical record number

### Status Filters
- `statuses` - Array of patient statuses (new, active, on_hold, discharged, inactive)

### Age Filters
- `ageMin` - Minimum age (inclusive)
- `ageMax` - Maximum age (inclusive)

### Date Range Filters
- `dateOfBirthFrom` / `dateOfBirthTo` - Date of birth range
- `createdAfter` / `createdBefore` - Creation date range
- `updatedAfter` / `updatedBefore` - Update date range

### Medical Filters
- `diagnosis` - Array of diagnoses
- `treatmentType` - Array of treatment types

### Location Filters
- `city` - City name
- `state` - State code

### Insurance Filters
- `insuranceProvider` - Insurance provider name
- `hasInsurance` - Boolean flag for insurance status

### Other Filters
- `isActive` - Boolean flag for active status
- `combineMode` - 'AND' or 'OR' logic for multiple criteria

## Autocomplete

The autocomplete feature provides real-time suggestions as users type.

**Supported Fields:**
- `name` - Patient names
- `email` - Email addresses
- `phone` - Phone numbers
- `cpf` - CPF numbers

**Usage Example:**
```typescript
// Get suggestions as user types
const suggestions = await searchService.getAutocompleteSuggestions(
  'Mar', // User typed "Mar"
  'name',
  10 // Maximum 10 suggestions
)

suggestions.forEach(suggestion => {
  console.log(suggestion.label) // "Maria Silva - 123.456.789-00"
  console.log(suggestion.patientId) // UUID
  console.log(suggestion.metadata.status) // "active"
})
```

## Performance Optimization

### Caching Strategy

The search service implements an LRU (Least Recently Used) cache with the following characteristics:

- **Cache TTL:** 5 minutes
- **Max Cache Size:** 100 entries
- **Cache Key:** JSON serialization of criteria + pagination
- **Eviction Policy:** LRU when cache is full

**Cache Management:**
```typescript
// Clear cache manually
searchService.clearCache()

// Get cache statistics
const stats = searchService.getCacheStats()
console.log(`Cache size: ${stats.size}/${stats.maxSize}`)
```

### Query Optimization Strategies

The optimizer recommends different strategies based on query characteristics:

1. **index-scan** - For queries using indexed fields (CPF, email, phone, status, dates)
2. **full-scan** - For queries without criteria (requires optimization)
3. **partition** - For large page sizes (>100 records)
4. **cache-first** - For moderate complexity queries
5. **parallel** - For complex queries with many criteria (>5)

### Indexed Fields

The following fields are indexed for optimal performance:
- `cpf`
- `email`
- `phone`
- `status`
- `created_at`
- `updated_at`

**Best Practice:** Always include at least one indexed field in your search criteria for optimal performance.

### Pagination Best Practices

- **Optimal Page Size:** 20 records
- **Maximum Page Size:** 100 records
- **Default Sort:** By name (ascending)

The optimizer automatically adjusts excessive page sizes to maintain performance.

## Performance Metrics

Every search returns performance metrics:

```typescript
interface SearchMetrics {
  executionTimeMs: number        // Query execution time
  totalResults: number           // Total matching records
  cacheHit: boolean             // Whether result came from cache
  queryComplexity: 'simple' | 'moderate' | 'complex'
}
```

## Examples

### Example 1: Basic Search
```typescript
const criteria = new SearchQueryBuilder()
  .withName('Silva')
  .build()

const results = await searchService.search(criteria, {
  page: 1,
  limit: 20,
  sortBy: 'name',
  sortOrder: 'asc'
})
```

### Example 2: Multi-Criteria Search
```typescript
const criteria = new SearchQueryBuilder()
  .withName('Silva')
  .withStatus(new PatientStatus('active'))
  .withAgeRange(25, 55)
  .withCity('São Paulo')
  .withInsuranceStatus(true)
  .build()

const results = await searchService.search(criteria, pagination)
```

### Example 3: Multi-Status Search
```typescript
const statuses = [
  new PatientStatus('active'),
  new PatientStatus('on_hold')
]

const results = await searchService.searchByStatuses(statuses, pagination)
```

### Example 4: Age Range Search
```typescript
// Children (0-12 years)
const children = await searchService.searchByAgeRange(0, 12)

// Seniors (65+ years)
const seniors = await searchService.searchByAgeRange(65, undefined)
```

### Example 5: Date Range Search
```typescript
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const recentPatients = await searchService.searchByDateRange(
  thirtyDaysAgo,
  new Date(),
  'created'
)
```

### Example 6: Using Templates
```typescript
// New patients in last 7 days
const newPatients = SearchQueryTemplates.newPatientsInLastDays(7)

// Active patients in São Paulo
const cityPatients = SearchQueryTemplates.activeInCity('São Paulo')

// Children patients
const children = SearchQueryTemplates.byAgeGroup('child')
```

### Example 7: Performance Optimization
```typescript
const optimizer = new SearchPerformanceOptimizer()

// Analyze before executing
const recommendation = optimizer.analyzeQuery(criteria, pagination)
if (recommendation.estimatedImpact === 'high') {
  console.warn('Query may be slow:', recommendation.suggestions)
}

// Optimize pagination
const optimizedPagination = optimizer.optimizePagination(pagination)

// Execute with optimizations
const results = await searchService.search(criteria, optimizedPagination)
```

## Testing

The advanced search system includes comprehensive unit tests:

- `AdvancedSearchService.test.ts` - 14 tests covering search, autocomplete, and caching
- `SearchQueryBuilder.test.ts` - 40 tests covering all builder methods and templates
- `SearchPerformanceOptimizer.test.ts` - 19 tests covering optimization strategies

Run tests:
```bash
npm test -- AdvancedSearchService.test.ts
npm test -- SearchQueryBuilder.test.ts
npm test -- SearchPerformanceOptimizer.test.ts
```

## Integration

The advanced search system integrates seamlessly with the existing Patient Management System:

1. **Repository Layer:** Uses `IPatientRepository` interface
2. **Domain Layer:** Works with `Patient` entities and value objects
3. **Application Layer:** Provides service-level abstractions
4. **UI Layer:** Ready for React component integration

## Future Enhancements

Potential improvements for future iterations:

1. **Elasticsearch Integration:** For full-text search capabilities
2. **Saved Searches:** Allow users to save and reuse complex queries
3. **Search History:** Track and suggest recent searches
4. **Advanced Filters UI:** React components for building complex queries
5. **Export Results:** Export search results to CSV/Excel
6. **Search Analytics:** Track popular searches and optimize accordingly
7. **Real-time Updates:** WebSocket integration for live search results
8. **Fuzzy Matching:** Improved name matching with phonetic algorithms

## API Reference

See the TypeScript interfaces in the source files for complete API documentation:

- `AdvancedSearchService.ts` - Main search service
- `SearchQueryBuilder.ts` - Query builder and templates
- `SearchPerformanceOptimizer.ts` - Performance optimization utilities
