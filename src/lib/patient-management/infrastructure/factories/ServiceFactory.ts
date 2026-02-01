// ============================================================================
// SERVICE FACTORY
// Factory for creating and configuring all application services
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { PatientRegistry } from '../../application/services/PatientRegistry'
import { MedicalRecordManager } from '../../application/services/MedicalRecordManager'
import { DocumentManager } from '../../application/services/DocumentManager'
import { StatusTracker } from '../../application/services/StatusTracker'
import { LGPDComplianceEngine } from '../../application/services/LGPDComplianceEngine'
import { DataPortabilityService } from '../../application/services/DataPortabilityService'
import { DataDeletionService } from '../../application/services/DataDeletionService'
import { DataValidationService } from '../../application/services/DataValidationService'
import { AdvancedSearchService } from '../../application/services/AdvancedSearchService'
import { SearchQueryBuilder } from '../../application/services/SearchQueryBuilder'
import { SearchPerformanceOptimizer } from '../../application/services/SearchPerformanceOptimizer'
import { AuditLogger } from '../services/AuditLogger'
import { EncryptionService } from '../services/EncryptionService'
import { AuditReportingService } from '../services/AuditReportingService'
import { SecurityMonitoringService } from '../services/SecurityMonitoringService'
import { AppointmentIntegrationService } from '../integration/AppointmentIntegrationService'
import { ReportIntegrationService } from '../integration/ReportIntegrationService'
import { IntegrationHub } from '../integration/IntegrationHub'
import { SupabasePatientRepository } from '../repositories/SupabasePatientRepository'
import { SupabaseMedicalRecordRepository } from '../repositories/SupabaseMedicalRecordRepository'
import { SupabaseDocumentRepository } from '../repositories/SupabaseDocumentRepository'

/**
 * Configuration for the service factory
 */
export interface ServiceFactoryConfig {
  supabaseClient: SupabaseClient
  encryptionKey?: string
  enableAuditLogging?: boolean
  enableSecurityMonitoring?: boolean
}

/**
 * Factory class for creating and configuring all application services
 * Implements dependency injection and service lifecycle management
 */
export class ServiceFactory {
  private supabaseClient: SupabaseClient
  private encryptionKey: string
  private enableAuditLogging: boolean
  private enableSecurityMonitoring: boolean

  // Singleton instances
  private static instances = new Map<string, any>()

  constructor(config: ServiceFactoryConfig) {
    this.supabaseClient = config.supabaseClient
    this.encryptionKey = config.encryptionKey || process.env.ENCRYPTION_KEY || 'default-key'
    this.enableAuditLogging = config.enableAuditLogging ?? true
    this.enableSecurityMonitoring = config.enableSecurityMonitoring ?? true
  }

  /**
   * Create or get singleton instance of a service
   */
  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!ServiceFactory.instances.has(key)) {
      ServiceFactory.instances.set(key, factory())
    }
    return ServiceFactory.instances.get(key) as T
  }

  /**
   * Clear all singleton instances (useful for testing)
   */
  public static clearInstances(): void {
    ServiceFactory.instances.clear()
  }

  // ============================================================================
  // REPOSITORY FACTORIES
  // ============================================================================

  public createPatientRepository(): SupabasePatientRepository {
    return this.getOrCreate('patientRepository', () => 
      new SupabasePatientRepository(this.supabaseClient)
    )
  }

  public createMedicalRecordRepository(): SupabaseMedicalRecordRepository {
    return this.getOrCreate('medicalRecordRepository', () =>
      new SupabaseMedicalRecordRepository(this.supabaseClient)
    )
  }

  public createDocumentRepository(): SupabaseDocumentRepository {
    return this.getOrCreate('documentRepository', () =>
      new SupabaseDocumentRepository(this.supabaseClient)
    )
  }

  // ============================================================================
  // INFRASTRUCTURE SERVICE FACTORIES
  // ============================================================================

  public createEncryptionService(): EncryptionService {
    return this.getOrCreate('encryptionService', () =>
      new EncryptionService(this.encryptionKey)
    )
  }

  public createAuditLogger(): AuditLogger {
    return this.getOrCreate('auditLogger', () =>
      new AuditLogger(this.supabaseClient)
    )
  }

  public createAuditReportingService(): AuditReportingService {
    return this.getOrCreate('auditReportingService', () =>
      new AuditReportingService(this.createAuditLogger())
    )
  }

  public createSecurityMonitoringService(): SecurityMonitoringService {
    return this.getOrCreate('securityMonitoringService', () =>
      new SecurityMonitoringService(
        this.createAuditLogger(),
        this.createAuditReportingService()
      )
    )
  }

  // ============================================================================
  // APPLICATION SERVICE FACTORIES
  // ============================================================================

  public createPatientRegistry(): PatientRegistry {
    return this.getOrCreate('patientRegistry', () =>
      new PatientRegistry(
        this.createPatientRepository(),
        this.createAuditLogger(),
        this.createDataValidationService()
      )
    )
  }

  public createMedicalRecordManager(): MedicalRecordManager {
    return this.getOrCreate('medicalRecordManager', () =>
      new MedicalRecordManager(
        this.createMedicalRecordRepository(),
        this.createPatientRepository(),
        this.createAuditLogger()
      )
    )
  }

  public createDocumentManager(): DocumentManager {
    return this.getOrCreate('documentManager', () =>
      new DocumentManager(
        this.createDocumentRepository(),
        this.createPatientRepository(),
        this.createEncryptionService(),
        this.createAuditLogger()
      )
    )
  }

  public createStatusTracker(): StatusTracker {
    return this.getOrCreate('statusTracker', () =>
      new StatusTracker(
        this.createPatientRepository(),
        this.createAuditLogger()
      )
    )
  }

  public createLGPDComplianceEngine(): LGPDComplianceEngine {
    return this.getOrCreate('lgpdComplianceEngine', () =>
      new LGPDComplianceEngine(
        this.supabaseClient,
        this.createEncryptionService(),
        this.createAuditLogger()
      )
    )
  }

  public createDataPortabilityService(): DataPortabilityService {
    return this.getOrCreate('dataPortabilityService', () =>
      new DataPortabilityService(
        this.createPatientRepository(),
        this.createMedicalRecordRepository(),
        this.createDocumentRepository(),
        this.createAuditLogger()
      )
    )
  }

  public createDataDeletionService(): DataDeletionService {
    return this.getOrCreate('dataDeletionService', () =>
      new DataDeletionService(
        this.createPatientRepository(),
        this.createMedicalRecordRepository(),
        this.createDocumentRepository(),
        this.createAuditLogger()
      )
    )
  }

  public createDataValidationService(): DataValidationService {
    return this.getOrCreate('dataValidationService', () =>
      new DataValidationService(
        this.createPatientRepository(),
        this.createMedicalRecordRepository()
      )
    )
  }

  public createAdvancedSearchService(): AdvancedSearchService {
    return this.getOrCreate('advancedSearchService', () =>
      new AdvancedSearchService(
        this.createPatientRepository(),
        this.createSearchQueryBuilder(),
        this.createSearchPerformanceOptimizer()
      )
    )
  }

  public createSearchQueryBuilder(): SearchQueryBuilder {
    return this.getOrCreate('searchQueryBuilder', () =>
      new SearchQueryBuilder()
    )
  }

  public createSearchPerformanceOptimizer(): SearchPerformanceOptimizer {
    return this.getOrCreate('searchPerformanceOptimizer', () =>
      new SearchPerformanceOptimizer(this.supabaseClient)
    )
  }

  // ============================================================================
  // INTEGRATION SERVICE FACTORIES
  // ============================================================================

  public createAppointmentIntegrationService(): AppointmentIntegrationService {
    return this.getOrCreate('appointmentIntegrationService', () =>
      new AppointmentIntegrationService({
        supabaseClient: this.supabaseClient,
        patientRepository: this.createPatientRepository(),
        auditLogger: this.createAuditLogger()
      })
    )
  }

  public createReportIntegrationService(): ReportIntegrationService {
    return this.getOrCreate('reportIntegrationService', () =>
      new ReportIntegrationService({
        supabaseClient: this.supabaseClient,
        patientRepository: this.createPatientRepository(),
        medicalRecordRepository: this.createMedicalRecordRepository(),
        auditLogger: this.createAuditLogger()
      })
    )
  }

  public createIntegrationHub(): IntegrationHub {
    return this.getOrCreate('integrationHub', () =>
      new IntegrationHub({
        appointmentIntegration: this.createAppointmentIntegrationService(),
        reportIntegration: this.createReportIntegrationService(),
        auditLogger: this.createAuditLogger()
      })
    )
  }
}
