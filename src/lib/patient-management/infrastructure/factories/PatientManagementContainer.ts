// ============================================================================
// PATIENT MANAGEMENT CONTAINER
// Dependency injection container providing unified access to all services
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { ServiceFactory, ServiceFactoryConfig } from './ServiceFactory'
import type { PatientRegistry } from '../../application/services/PatientRegistry'
import type { MedicalRecordManager } from '../../application/services/MedicalRecordManager'
import type { DocumentManager } from '../../application/services/DocumentManager'
import type { StatusTracker } from '../../application/services/StatusTracker'
import type { LGPDComplianceEngine } from '../../application/services/LGPDComplianceEngine'
import type { DataPortabilityService } from '../../application/services/DataPortabilityService'
import type { DataDeletionService } from '../../application/services/DataDeletionService'
import type { DataValidationService } from '../../application/services/DataValidationService'
import type { AdvancedSearchService } from '../../application/services/AdvancedSearchService'
import type { AuditLogger } from '../services/AuditLogger'
import type { EncryptionService } from '../services/EncryptionService'
import type { AuditReportingService } from '../services/AuditReportingService'
import type { SecurityMonitoringService } from '../services/SecurityMonitoringService'
import type { IntegrationHub } from '../integration/IntegrationHub'

/**
 * Dependency injection container for the Patient Management System
 * Provides centralized access to all services with proper dependency management
 */
export class PatientManagementContainer {
  private serviceFactory: ServiceFactory
  private static instance: PatientManagementContainer | null = null

  private constructor(config: ServiceFactoryConfig) {
    this.serviceFactory = new ServiceFactory(config)
  }

  /**
   * Initialize the container with configuration
   * Should be called once at application startup
   */
  public static initialize(config: ServiceFactoryConfig): PatientManagementContainer {
    if (!PatientManagementContainer.instance) {
      PatientManagementContainer.instance = new PatientManagementContainer(config)
    }
    return PatientManagementContainer.instance
  }

  /**
   * Get the singleton instance of the container
   * Throws error if not initialized
   */
  public static getInstance(): PatientManagementContainer {
    if (!PatientManagementContainer.instance) {
      throw new Error('PatientManagementContainer not initialized. Call initialize() first.')
    }
    return PatientManagementContainer.instance
  }

  /**
   * Reset the container (useful for testing)
   */
  public static reset(): void {
    PatientManagementContainer.instance = null
    ServiceFactory.clearInstances()
  }

  // ============================================================================
  // CORE SERVICES
  // ============================================================================

  public get patientRegistry(): PatientRegistry {
    return this.serviceFactory.createPatientRegistry()
  }

  public get medicalRecordManager(): MedicalRecordManager {
    return this.serviceFactory.createMedicalRecordManager()
  }

  public get documentManager(): DocumentManager {
    return this.serviceFactory.createDocumentManager()
  }

  public get statusTracker(): StatusTracker {
    return this.serviceFactory.createStatusTracker()
  }

  // ============================================================================
  // LGPD COMPLIANCE SERVICES
  // ============================================================================

  public get lgpdComplianceEngine(): LGPDComplianceEngine {
    return this.serviceFactory.createLGPDComplianceEngine()
  }

  public get dataPortabilityService(): DataPortabilityService {
    return this.serviceFactory.createDataPortabilityService()
  }

  public get dataDeletionService(): DataDeletionService {
    return this.serviceFactory.createDataDeletionService()
  }

  // ============================================================================
  // DATA MANAGEMENT SERVICES
  // ============================================================================

  public get dataValidationService(): DataValidationService {
    return this.serviceFactory.createDataValidationService()
  }

  public get advancedSearchService(): AdvancedSearchService {
    return this.serviceFactory.createAdvancedSearchService()
  }

  // ============================================================================
  // INFRASTRUCTURE SERVICES
  // ============================================================================

  public get auditLogger(): AuditLogger {
    return this.serviceFactory.createAuditLogger()
  }

  public get encryptionService(): EncryptionService {
    return this.serviceFactory.createEncryptionService()
  }

  public get auditReportingService(): AuditReportingService {
    return this.serviceFactory.createAuditReportingService()
  }

  public get securityMonitoringService(): SecurityMonitoringService {
    return this.serviceFactory.createSecurityMonitoringService()
  }

  // ============================================================================
  // INTEGRATION SERVICES
  // ============================================================================

  public get integrationHub(): IntegrationHub {
    return this.serviceFactory.createIntegrationHub()
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get all core services as a bundle
   */
  public getCoreServices() {
    return {
      patientRegistry: this.patientRegistry,
      medicalRecordManager: this.medicalRecordManager,
      documentManager: this.documentManager,
      statusTracker: this.statusTracker
    }
  }

  /**
   * Get all LGPD compliance services as a bundle
   */
  public getComplianceServices() {
    return {
      lgpdComplianceEngine: this.lgpdComplianceEngine,
      dataPortabilityService: this.dataPortabilityService,
      dataDeletionService: this.dataDeletionService
    }
  }

  /**
   * Get all infrastructure services as a bundle
   */
  public getInfrastructureServices() {
    return {
      auditLogger: this.auditLogger,
      encryptionService: this.encryptionService,
      auditReportingService: this.auditReportingService,
      securityMonitoringService: this.securityMonitoringService
    }
  }

  /**
   * Health check for all services
   */
  public async healthCheck(): Promise<{
    healthy: boolean
    services: Record<string, boolean>
  }> {
    const services: Record<string, boolean> = {}
    
    try {
      // Check integration hub
      const hubHealth = await this.integrationHub.checkIntegrationHealth()
      services.integrationHub = hubHealth.healthy
      services.appointmentIntegration = hubHealth.services.appointment
      services.reportIntegration = hubHealth.services.report

      // All services are healthy if integration hub is healthy
      const healthy = Object.values(services).every(status => status)

      return { healthy, services }
    } catch (error) {
      return {
        healthy: false,
        services: {
          error: false
        }
      }
    }
  }
}
