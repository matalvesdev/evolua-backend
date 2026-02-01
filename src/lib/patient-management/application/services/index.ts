// ============================================================================
// APPLICATION SERVICES INDEX
// Exports all application services for the patient management system
// ============================================================================

// Core services
export { PatientRegistry } from './PatientRegistry'
export { MedicalRecordManager } from './MedicalRecordManager'
export { DocumentManager } from './DocumentManager'
export { StatusTracker } from './StatusTracker'

// Advanced search services
export { AdvancedSearchService } from './AdvancedSearchService'
export { SearchQueryBuilder, SearchQueryTemplates } from './SearchQueryBuilder'
export { SearchPerformanceOptimizer } from './SearchPerformanceOptimizer'

// LGPD Compliance services
export { LGPDComplianceEngine } from './LGPDComplianceEngine'
export { DataPortabilityService } from './DataPortabilityService'
export { DataDeletionService } from './DataDeletionService'

// Data Validation services
export { DataValidationService } from './DataValidationService'

// Infrastructure services
export { EncryptionService, createEncryptionService } from '../../infrastructure/services/EncryptionService'
export { AuditLogger } from '../../infrastructure/services/AuditLogger'

// Types and interfaces
export type {
  // LGPD Compliance types
  ConsentRecord,
  ConsentRequest,
  DataAccessLog,
  DataPortabilityRequest,
  DataDeletionRequest,
  IncidentReport,
  ConsentType,
  LegalBasis,
  DataOperation,
  AccessResult,
  ExportFormat,
  RequestStatus,
  IncidentType,
  IncidentSeverity,
  IncidentStatus
} from './LGPDComplianceEngine'

export type {
  // Data Portability types
  PatientDataExport,
  DataExportRequest,
  ExportValidationResult
} from './DataPortabilityService'

export type {
  // Data Deletion types
  DeletionValidationResult,
  DeletionExecutionResult,
  DeletedItem,
  PreservedItem,
  RetentionRequirement,
  RetentionException,
  DeletionReason,
  DeletionStatus,
  DeletionScope
} from './DataDeletionService'

export type {
  // Status Tracker types
  StatusTransition,
  StatusTransitionRequest,
  StatusHistoryQuery,
  StatusStatistics,
  StatusFilterCriteria,
  StatusTransitionRule
} from './StatusTracker'

export type {
  // Audit Logger types
  AuditLogEntry,
  AuditQuery,
  AuditStatistics
} from '../../infrastructure/services/AuditLogger'

export type {
  // Encryption types
  EncryptionResult,
  DecryptionInput
} from '../../infrastructure/services/EncryptionService'

export type {
  // Advanced Search types
  AdvancedSearchCriteria,
  AutocompleteSuggestion,
  SearchMetrics,
  AdvancedSearchResult
} from './AdvancedSearchService'

export type {
  // Search Performance types
  OptimizationStrategy,
  OptimizationRecommendation,
  QueryExecutionPlan
} from './SearchPerformanceOptimizer'

export type {
  // Data Validation types
  FieldValidationResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ReferentialIntegrityResult,
  ReferentialIntegrityViolation,
  BulkValidationResult,
  PatientDataForValidation
} from './DataValidationService'