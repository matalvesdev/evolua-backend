// ============================================================================
// REPOSITORY EXPORTS
// Central export point for all repository interfaces and implementations
// ============================================================================

export { IPatientRepository } from './IPatientRepository'
export type { 
  CreatePatientData, 
  UpdatePatientData, 
  SearchCriteria, 
  PaginationOptions, 
  PaginatedResult 
} from './IPatientRepository'

export { SupabasePatientRepository } from './SupabasePatientRepository'

export { IMedicalRecordRepository } from './IMedicalRecordRepository'
export type {
  CreateMedicalRecordRequest,
  UpdateMedicalRecordRequest,
  TreatmentTimeline,
  ChronologicalEvent
} from './IMedicalRecordRepository'

export { SupabaseMedicalRecordRepository } from './SupabaseMedicalRecordRepository'

export { IDocumentRepository } from './IDocumentRepository'
export type {
  CreateDocumentData,
  UpdateDocumentData,
  DocumentSearchCriteria,
  DocumentValidationResult
} from './IDocumentRepository'

export { SupabaseDocumentRepository } from './SupabaseDocumentRepository'