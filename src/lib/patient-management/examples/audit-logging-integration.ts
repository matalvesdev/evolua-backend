// ============================================================================
// AUDIT LOGGING INTEGRATION EXAMPLE
// Demonstrates how to integrate audit logging throughout the patient management system
// ============================================================================

import { AuditLogger } from '../infrastructure/services/AuditLogger'
import { SupabaseAuditRepository } from '../infrastructure/repositories/SupabaseAuditRepository'
import { EncryptionService } from '../infrastructure/services/EncryptionService'
import { PatientRegistry } from '../application/services/PatientRegistry'
import { MedicalRecordManager } from '../application/services/MedicalRecordManager'
import { DocumentManager } from '../application/services/DocumentManager'
import { StatusTracker } from '../application/services/StatusTracker'
import { LGPDComplianceEngine } from '../application/services/LGPDComplianceEngine'
import { PatientId } from '../domain/value-objects/PatientId'
import { UserId } from '../domain/value-objects/UserId'

/**
 * Audit-Aware Patient Registry
 * 
 * Example of how to integrate audit logging into the PatientRegistry service
 */
export class AuditAwarePatientRegistry extends PatientRegistry {
  constructor(
    patientRepository: any,
    private readonly auditLogger: AuditLogger,
    private readonly currentUserId: UserId
  ) {
    super(patientRepository)
  }

  async createPatient(patientData: any): Promise<any> {
    try {
      // Log the creation attempt
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId: 'pending' as PatientId,
        operation: 'create',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: 'New patient registration'
      })

      // Perform the actual creation
      const patient = await super.createPatient(patientData)

      // Log successful creation with actual patient ID
      await this.auditLogger.logDataModification(
        this.currentUserId,
        patient.id,
        'create',
        'patient',
        undefined,
        patientData,
        'Patient successfully created'
      )

      return patient
    } catch (error) {
      // Log failed creation attempt
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId: 'failed' as PatientId,
        operation: 'create',
        dataType: 'patient',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Patient creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }

  async updatePatient(patientId: PatientId, updates: any): Promise<any> {
    try {
      // Get current patient data for audit trail
      const currentPatient = await this.getPatient(patientId)
      
      if (!currentPatient) {
        await this.auditLogger.logDataAccess({
          userId: this.currentUserId,
          patientId,
          operation: 'update',
          dataType: 'patient',
          accessResult: 'denied',
          timestamp: new Date(),
          justification: 'Patient not found'
        })
        throw new Error('Patient not found')
      }

      // Log access to patient data
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: 'Reading patient data for update'
      })

      // Perform the update
      const updatedPatient = await super.updatePatient(patientId, updates)

      // Log the modification
      await this.auditLogger.logDataModification(
        this.currentUserId,
        patientId,
        'update',
        'patient',
        currentPatient,
        updatedPatient,
        'Patient information updated'
      )

      return updatedPatient
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'update',
        dataType: 'patient',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }

  async getPatient(patientId: PatientId): Promise<any> {
    try {
      const patient = await super.getPatient(patientId)

      // Log data access
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: patient ? 'granted' : 'denied',
        timestamp: new Date(),
        justification: patient ? 'Patient data accessed' : 'Patient not found'
      })

      return patient
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'read',
        dataType: 'patient',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Access failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }

  async deletePatient(patientId: PatientId): Promise<void> {
    try {
      // Get patient data before deletion for audit trail
      const patient = await this.getPatient(patientId)
      
      if (!patient) {
        throw new Error('Patient not found')
      }

      // Perform deletion
      await super.deletePatient(patientId)

      // Log deletion
      await this.auditLogger.logDataModification(
        this.currentUserId,
        patientId,
        'delete',
        'patient',
        patient,
        undefined,
        'Patient record deleted'
      )
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'delete',
        dataType: 'patient',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }
}

/**
 * Audit-Aware Medical Record Manager
 * 
 * Example of integrating audit logging into medical record operations
 */
export class AuditAwareMedicalRecordManager extends MedicalRecordManager {
  constructor(
    medicalRecordRepository: any,
    private readonly auditLogger: AuditLogger,
    private readonly currentUserId: UserId
  ) {
    super(medicalRecordRepository)
  }

  async createMedicalRecord(patientId: PatientId, recordData: any): Promise<any> {
    try {
      const record = await super.createMedicalRecord(patientId, recordData)

      await this.auditLogger.logDataModification(
        this.currentUserId,
        patientId,
        'create',
        'medical_record',
        undefined,
        recordData,
        'Medical record created'
      )

      return record
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'create',
        dataType: 'medical_record',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Medical record creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }

  async addProgressNote(recordId: string, patientId: PatientId, note: any): Promise<void> {
    try {
      await super.addProgressNote(recordId, note)

      await this.auditLogger.logDataModification(
        this.currentUserId,
        patientId,
        'update',
        'medical_record',
        undefined,
        { progressNote: note },
        'Progress note added to medical record'
      )
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'update',
        dataType: 'medical_record',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Progress note addition failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }

  async getMedicalHistory(patientId: PatientId): Promise<any[]> {
    try {
      const history = await super.getMedicalHistory(patientId)

      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'read',
        dataType: 'medical_record',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: 'Medical history accessed'
      })

      return history
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'read',
        dataType: 'medical_record',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Medical history access failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }
}

/**
 * Audit-Aware Document Manager
 * 
 * Example of integrating audit logging into document operations
 */
export class AuditAwareDocumentManager extends DocumentManager {
  constructor(
    documentRepository: any,
    private readonly auditLogger: AuditLogger,
    private readonly currentUserId: UserId
  ) {
    super(documentRepository)
  }

  async uploadDocument(patientId: PatientId, file: File, metadata: any): Promise<any> {
    try {
      const document = await super.uploadDocument(patientId, file, metadata)

      await this.auditLogger.logDataModification(
        this.currentUserId,
        patientId,
        'create',
        'document',
        undefined,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          metadata
        },
        'Document uploaded'
      )

      return document
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'create',
        dataType: 'document',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }

  async getDocument(documentId: string, patientId: PatientId): Promise<any> {
    try {
      const document = await super.getDocument(documentId)

      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'read',
        dataType: 'document',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: 'Document accessed'
      })

      return document
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'read',
        dataType: 'document',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Document access failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }

  async deleteDocument(documentId: string, patientId: PatientId): Promise<void> {
    try {
      // Get document info before deletion
      const document = await this.getDocument(documentId, patientId)
      
      await super.deleteDocument(documentId)

      await this.auditLogger.logDataModification(
        this.currentUserId,
        patientId,
        'delete',
        'document',
        document,
        undefined,
        'Document deleted'
      )
    } catch (error) {
      await this.auditLogger.logDataAccess({
        userId: this.currentUserId,
        patientId,
        operation: 'delete',
        dataType: 'document',
        accessResult: 'denied',
        timestamp: new Date(),
        justification: `Document deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      throw error
    }
  }
}

/**
 * Comprehensive Audit Integration Factory
 * 
 * Factory class to create audit-aware services with proper dependency injection
 */
export class AuditIntegrationFactory {
  private auditLogger: AuditLogger

  constructor() {
    // Initialize audit logging infrastructure
    const auditRepository = new SupabaseAuditRepository()
    const encryptionService = new EncryptionService()
    this.auditLogger = new AuditLogger(auditRepository, encryptionService)
  }

  createAuditAwarePatientRegistry(patientRepository: any, userId: UserId): AuditAwarePatientRegistry {
    return new AuditAwarePatientRegistry(patientRepository, this.auditLogger, userId)
  }

  createAuditAwareMedicalRecordManager(medicalRecordRepository: any, userId: UserId): AuditAwareMedicalRecordManager {
    return new AuditAwareMedicalRecordManager(medicalRecordRepository, this.auditLogger, userId)
  }

  createAuditAwareDocumentManager(documentRepository: any, userId: UserId): AuditAwareDocumentManager {
    return new AuditAwareDocumentManager(documentRepository, this.auditLogger, userId)
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger
  }
}

/**
 * Usage Example
 * 
 * Demonstrates how to use the audit-aware services in a real application
 */
export async function auditIntegrationExample() {
  const factory = new AuditIntegrationFactory()
  const userId = 'therapist123' as UserId
  const patientId = 'patient456' as PatientId

  // Create audit-aware services
  const patientRegistry = factory.createAuditAwarePatientRegistry(null, userId)
  const medicalRecordManager = factory.createAuditAwareMedicalRecordManager(null, userId)
  const documentManager = factory.createAuditAwareDocumentManager(null, userId)
  const auditLogger = factory.getAuditLogger()

  try {
    // Example: Create a new patient (automatically audited)
    const newPatient = await patientRegistry.createPatient({
      name: 'João Silva',
      dateOfBirth: new Date('1990-01-01'),
      cpf: '123.456.789-00'
    })

    // Example: Add medical record (automatically audited)
    await medicalRecordManager.createMedicalRecord(newPatient.id, {
      diagnosis: ['Speech delay'],
      treatmentPlan: 'Weekly speech therapy sessions'
    })

    // Example: Upload document (automatically audited)
    const file = new File(['test content'], 'medical-report.pdf', { type: 'application/pdf' })
    await documentManager.uploadDocument(newPatient.id, file, {
      title: 'Initial Assessment Report',
      documentType: 'medical_report'
    })

    // Example: Generate audit report
    const auditStats = await auditLogger.generateAuditStatistics(
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date()
    )

    console.log('Audit Statistics:', auditStats)

    // Example: Export audit logs for compliance
    const auditExport = await auditLogger.exportAuditLogs(
      {
        patientId: newPatient.id,
        fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      'json'
    )

    console.log('Audit Export:', auditExport)

    // Example: Query specific audit logs
    const patientAuditLogs = await auditLogger.queryAuditLogs({
      patientId: newPatient.id,
      operation: 'create'
    })

    console.log('Patient Creation Audit Logs:', patientAuditLogs)

  } catch (error) {
    console.error('Operation failed:', error)
    
    // All failures are automatically audited by the audit-aware services
    // Additional error handling can be added here
  }
}

/**
 * Authentication Event Logging Example
 * 
 * Shows how to integrate audit logging with authentication events
 */
export class AuthenticationAuditLogger {
  constructor(private readonly auditLogger: AuditLogger) {}

  async logUserLogin(userId: UserId, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.auditLogger.logAuthenticationEvent(
      userId,
      success ? 'login' : 'failed_login',
      success,
      ipAddress,
      userAgent
    )
  }

  async logUserLogout(userId: UserId, ipAddress?: string): Promise<void> {
    await this.auditLogger.logAuthenticationEvent(
      userId,
      'logout',
      true,
      ipAddress
    )
  }

  async logPasswordChange(userId: UserId, success: boolean): Promise<void> {
    await this.auditLogger.logAuthenticationEvent(
      userId,
      'password_change',
      success
    )
  }
}

/**
 * LGPD Compliance Audit Integration
 * 
 * Shows how to integrate audit logging with LGPD compliance events
 */
export class LGPDComplianceAuditLogger {
  constructor(private readonly auditLogger: AuditLogger) {}

  async logConsentEvent(userId: UserId, patientId: PatientId, consentType: string, granted: boolean): Promise<void> {
    await this.auditLogger.logLGPDEvent(
      userId,
      patientId,
      granted ? 'consent_granted' : 'consent_withdrawn',
      {
        consentType,
        granted,
        timestamp: new Date()
      }
    )
  }

  async logDataExportRequest(userId: UserId, patientId: PatientId, exportFormat: string): Promise<void> {
    await this.auditLogger.logLGPDEvent(
      userId,
      patientId,
      'data_export',
      {
        exportFormat,
        requestedBy: userId,
        timestamp: new Date()
      }
    )
  }

  async logDataDeletionRequest(userId: UserId, patientId: PatientId, reason: string): Promise<void> {
    await this.auditLogger.logLGPDEvent(
      userId,
      patientId,
      'data_deletion',
      {
        reason,
        requestedBy: userId,
        timestamp: new Date()
      }
    )
  }

  async logDataBreachDetection(userId: UserId, patientId: PatientId, breachDetails: any): Promise<void> {
    await this.auditLogger.logLGPDEvent(
      userId,
      patientId,
      'breach_detected',
      {
        ...breachDetails,
        detectedBy: userId,
        timestamp: new Date()
      }
    )
  }
}