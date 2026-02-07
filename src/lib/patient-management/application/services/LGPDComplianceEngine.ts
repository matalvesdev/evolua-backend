// ============================================================================
// LGPD COMPLIANCE ENGINE
// Service layer for managing LGPD compliance and data protection
// ============================================================================

import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { IPatientRepository } from '../../infrastructure/repositories/IPatientRepository'
import { IDocumentRepository } from '../../infrastructure/repositories/IDocumentRepository'
import { IMedicalRecordRepository } from '../../infrastructure/repositories/IMedicalRecordRepository'

// LGPD Compliance interfaces
export interface ConsentRecord {
  id: string
  patientId: PatientId
  consentType: ConsentType
  granted: boolean
  grantedAt: Date
  withdrawnAt?: Date
  legalBasis: LegalBasis
  recordedBy: UserId
}

export interface ConsentRequest {
  patientId: PatientId
  consentType: ConsentType
  granted: boolean
  legalBasis: LegalBasis
  userId: UserId
}

export interface DataAccessLog {
  id: string
  userId: UserId
  patientId: PatientId
  operation: DataOperation
  dataType: string
  accessResult: AccessResult
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  justification?: string
}

export interface DataPortabilityRequest {
  id: string
  patientId: PatientId
  requestedBy: UserId
  requestedAt: Date
  format: ExportFormat
  status: RequestStatus
  completedAt?: Date
  downloadUrl?: string
  expiresAt?: Date
}

export interface DataDeletionRequest {
  id: string
  patientId: PatientId
  requestedBy: UserId
  requestedAt: Date
  reason: string
  status: RequestStatus
  completedAt?: Date
  auditTrailPreserved: boolean
}

export interface IncidentReport {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  description: string
  affectedPatients: PatientId[]
  detectedAt: Date
  reportedAt: Date
  reportedBy: UserId
  status: IncidentStatus
  mitigationActions: string[]
  resolved: boolean
  resolvedAt?: Date
}

// Enums and types
export type ConsentType = 
  | 'data_processing'
  | 'data_sharing'
  | 'marketing'
  | 'research'
  | 'automated_decision_making'

export type LegalBasis = 
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests'

export type DataOperation = 
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'share'

export type AccessResult = 
  | 'granted'
  | 'denied'
  | 'partial'

export type ExportFormat = 
  | 'json'
  | 'xml'
  | 'csv'
  | 'pdf'

export type RequestStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type IncidentType = 
  | 'data_breach'
  | 'unauthorized_access'
  | 'data_loss'
  | 'system_compromise'
  | 'human_error'

export type IncidentSeverity = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export type IncidentStatus = 
  | 'detected'
  | 'investigating'
  | 'contained'
  | 'resolved'

/**
 * LGPD Compliance Engine
 * 
 * Manages consent, data access control, data portability, deletion requests,
 * and incident response for LGPD compliance.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export class LGPDComplianceEngine {
  constructor(
    private readonly patientRepository: IPatientRepository,
    private readonly documentRepository: IDocumentRepository,
    private readonly medicalRecordRepository: IMedicalRecordRepository,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogger: AuditLogger
  ) {}

  // ============================================================================
  // CONSENT MANAGEMENT
  // ============================================================================

  /**
   * Record patient consent for data processing
   * @param request - Consent request details
   * @returns Promise resolving to consent record
   */
  async recordConsent(request: ConsentRequest): Promise<ConsentRecord> {
    try {
      // Validate patient exists
      const patient = await this.patientRepository.findById(request.patientId)
      if (!patient) {
        throw new Error('Patient not found')
      }

      // Create consent record
      const consentRecord: ConsentRecord = {
        id: this.generateConsentId(),
        patientId: request.patientId,
        consentType: request.consentType,
        granted: request.granted,
        grantedAt: new Date(),
        legalBasis: request.legalBasis,
        recordedBy: request.userId
      }

      // Store consent record (would be implemented in a consent repository)
      await this.storeConsentRecord(consentRecord)

      // Log the consent action
      await this.auditLogger.logDataAccess({
        userId: request.userId,
        patientId: request.patientId,
        operation: 'create',
        dataType: 'consent',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: `Consent ${request.granted ? 'granted' : 'withdrawn'} for ${request.consentType}`
      })

      return consentRecord
    } catch (error) {
      throw new Error(`Consent recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Withdraw patient consent
   * @param patientId - Patient ID
   * @param consentType - Type of consent to withdraw
   * @param userId - User performing the action
   * @returns Promise resolving to updated consent record
   */
  async withdrawConsent(
    patientId: PatientId,
    consentType: ConsentType,
    userId: UserId
  ): Promise<ConsentRecord> {
    try {
      // Find existing consent record
      const existingConsent = await this.findConsentRecord(patientId, consentType)
      if (!existingConsent) {
        throw new Error('Consent record not found')
      }

      if (!existingConsent.granted) {
        throw new Error('Consent already withdrawn')
      }

      // Update consent record
      const updatedConsent: ConsentRecord = {
        ...existingConsent,
        granted: false,
        withdrawnAt: new Date()
      }

      await this.updateConsentRecord(updatedConsent)

      // Log the withdrawal
      await this.auditLogger.logDataAccess({
        userId,
        patientId,
        operation: 'update',
        dataType: 'consent',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: `Consent withdrawn for ${consentType}`
      })

      return updatedConsent
    } catch (error) {
      throw new Error(`Consent withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if user has permission to access patient data
   * @param userId - User requesting access
   * @param patientId - Patient whose data is being accessed
   * @param operation - Type of operation being performed
   * @returns Promise resolving to access permission result
   */
  async checkDataAccess(
    userId: UserId,
    patientId: PatientId,
    operation: DataOperation
  ): Promise<boolean> {
    try {
      // Check if patient exists
      const patient = await this.patientRepository.findById(patientId)
      if (!patient) {
        await this.logAccessAttempt(userId, patientId, operation, 'denied', 'Patient not found')
        return false
      }

      // Check user authorization (simplified - would integrate with auth system)
      const hasPermission = await this.checkUserPermission(userId, patientId, operation)
      if (!hasPermission) {
        await this.logAccessAttempt(userId, patientId, operation, 'denied', 'Insufficient permissions')
        return false
      }

      // Check consent for data processing operations
      if (this.requiresConsent(operation)) {
        const hasConsent = await this.checkConsent(patientId, 'data_processing')
        if (!hasConsent) {
          await this.logAccessAttempt(userId, patientId, operation, 'denied', 'No consent for data processing')
          return false
        }
      }

      // Log successful access check
      await this.logAccessAttempt(userId, patientId, operation, 'granted', 'Access authorized')
      return true
    } catch (error) {
      await this.logAccessAttempt(userId, patientId, operation, 'denied', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }

  // ============================================================================
  // DATA PORTABILITY
  // ============================================================================

  /**
   * Process data portability request
   * @param patientId - Patient requesting data export
   * @param format - Export format
   * @param userId - User processing the request
   * @returns Promise resolving to portability request
   */
  async processDataPortabilityRequest(
    patientId: PatientId,
    format: ExportFormat,
    userId: UserId
  ): Promise<DataPortabilityRequest> {
    try {
      // Validate patient exists
      const patient = await this.patientRepository.findById(patientId)
      if (!patient) {
        throw new Error('Patient not found')
      }

      // Create portability request
      const request: DataPortabilityRequest = {
        id: this.generateRequestId(),
        patientId,
        requestedBy: userId,
        requestedAt: new Date(),
        format,
        status: 'processing'
      }

      // Export patient data
      const exportedData = await this.exportPatientData(patientId, format)
      
      // Store exported data securely and generate download URL
      const downloadUrl = await this.storeExportedData(exportedData, request.id)
      
      // Update request with completion details
      const completedRequest: DataPortabilityRequest = {
        ...request,
        status: 'completed',
        completedAt: new Date(),
        downloadUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }

      await this.storePortabilityRequest(completedRequest)

      // Log the export
      await this.auditLogger.logDataAccess({
        userId,
        patientId,
        operation: 'export',
        dataType: 'patient_data',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: `Data portability request processed in ${format} format`
      })

      return completedRequest
    } catch (error) {
      throw new Error(`Data portability request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================================================
  // DATA DELETION
  // ============================================================================

  /**
   * Process data deletion request
   * @param patientId - Patient whose data should be deleted
   * @param reason - Reason for deletion
   * @param userId - User processing the request
   * @returns Promise resolving to deletion request
   */
  async processDataDeletionRequest(
    patientId: PatientId,
    reason: string,
    userId: UserId
  ): Promise<DataDeletionRequest> {
    try {
      // Validate patient exists
      const patient = await this.patientRepository.findById(patientId)
      if (!patient) {
        throw new Error('Patient not found')
      }

      // Create deletion request
      const request: DataDeletionRequest = {
        id: this.generateRequestId(),
        patientId,
        requestedBy: userId,
        requestedAt: new Date(),
        reason,
        status: 'processing',
        auditTrailPreserved: true
      }

      // Preserve audit trail before deletion
      await this.preserveAuditTrail(patientId)

      // Delete patient data
      await this.deletePatientData(patientId)

      // Update request status
      const completedRequest: DataDeletionRequest = {
        ...request,
        status: 'completed',
        completedAt: new Date()
      }

      await this.storeDeletionRequest(completedRequest)

      // Log the deletion
      await this.auditLogger.logDataAccess({
        userId,
        patientId,
        operation: 'delete',
        dataType: 'patient_data',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: `Data deletion request processed: ${reason}`
      })

      return completedRequest
    } catch (error) {
      throw new Error(`Data deletion request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================================================
  // ENCRYPTION SERVICES
  // ============================================================================

  /**
   * Encrypt sensitive data
   * @param data - Data to encrypt
   * @returns Promise resolving to encrypted data
   */
  async encryptSensitiveData(data: any): Promise<string> {
    try {
      return await this.encryptionService.encrypt(JSON.stringify(data))
    } catch (error) {
      throw new Error(`Data encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData - Encrypted data to decrypt
   * @returns Promise resolving to decrypted data
   */
  async decryptSensitiveData(encryptedData: string): Promise<any> {
    try {
      const decryptedString = await this.encryptionService.decrypt(encryptedData)
      return JSON.parse(decryptedString)
    } catch (error) {
      throw new Error(`Data decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================================================
  // INCIDENT RESPONSE
  // ============================================================================

  /**
   * Report security incident
   * @param incident - Incident details
   * @returns Promise resolving to incident report
   */
  async reportIncident(incident: Omit<IncidentReport, 'id' | 'reportedAt'>): Promise<IncidentReport> {
    try {
      const incidentReport: IncidentReport = {
        ...incident,
        id: this.generateIncidentId(),
        reportedAt: new Date()
      }

      await this.storeIncidentReport(incidentReport)

      // Trigger automated response based on severity
      if (incident.severity === 'critical' || incident.severity === 'high') {
        await this.triggerEmergencyResponse(incidentReport)
      }

      // Log the incident
      await this.auditLogger.logDataAccess({
        userId: incident.reportedBy,
        patientId: incident.affectedPatients[0] || ('system' as PatientId),
        operation: 'create',
        dataType: 'incident_report',
        accessResult: 'granted',
        timestamp: new Date(),
        justification: `Security incident reported: ${incident.type}`
      })

      return incidentReport
    } catch (error) {
      throw new Error(`Incident reporting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async storeConsentRecord(consent: ConsentRecord): Promise<void> {
    // Implementation would store in consent repository
    // Consent record stored (logging removed to prevent async test warnings)
  }

  private async findConsentRecord(patientId: PatientId, consentType: ConsentType): Promise<ConsentRecord | null> {
    // Implementation would query consent repository
    return null
  }

  private async updateConsentRecord(consent: ConsentRecord): Promise<void> {
    // Implementation would update consent repository
    console.log('Updating consent record:', consent.id)
  }

  private async checkUserPermission(userId: UserId, patientId: PatientId, operation: DataOperation): Promise<boolean> {
    // Implementation would check user permissions
    return true // Simplified for now
  }

  private requiresConsent(operation: DataOperation): boolean {
    return ['read', 'update', 'share'].includes(operation)
  }

  private async checkConsent(patientId: PatientId, consentType: ConsentType): Promise<boolean> {
    // Implementation would check consent status
    return true // Simplified for now
  }

  private async logAccessAttempt(
    userId: UserId,
    patientId: PatientId,
    operation: DataOperation,
    result: AccessResult,
    justification: string
  ): Promise<void> {
    await this.auditLogger.logDataAccess({
      userId,
      patientId,
      operation,
      dataType: 'patient_data',
      accessResult: result,
      timestamp: new Date(),
      justification
    })
  }

  private async exportPatientData(patientId: PatientId, format: ExportFormat): Promise<any> {
    // Implementation would export all patient data
    const patient = await this.patientRepository.findById(patientId)
    const documents = await this.documentRepository.findByPatientId(patientId)
    const medicalRecords = await this.medicalRecordRepository.findByPatientId(patientId)

    return {
      patient,
      documents,
      medicalRecords,
      exportedAt: new Date(),
      format
    }
  }

  private async storeExportedData(data: any, requestId: string): Promise<string> {
    // Implementation would store exported data securely
    return `https://secure-storage.example.com/exports/${requestId}`
  }

  private async storePortabilityRequest(request: DataPortabilityRequest): Promise<void> {
    // Implementation would store portability request
    console.log('Storing portability request:', request.id)
  }

  private async preserveAuditTrail(patientId: PatientId): Promise<void> {
    // Implementation would preserve audit trail
    console.log('Preserving audit trail for patient:', patientId)
  }

  private async deletePatientData(patientId: PatientId): Promise<void> {
    // Implementation would delete patient data while preserving audit trail
    console.log('Deleting patient data:', patientId)
  }

  private async storeDeletionRequest(request: DataDeletionRequest): Promise<void> {
    // Implementation would store deletion request
    console.log('Storing deletion request:', request.id)
  }

  private async storeIncidentReport(incident: IncidentReport): Promise<void> {
    // Implementation would store incident report
    console.log('Storing incident report:', incident.id)
  }

  private async triggerEmergencyResponse(incident: IncidentReport): Promise<void> {
    // Implementation would trigger emergency response procedures
    console.log('Triggering emergency response for incident:', incident.id)
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateRequestId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

export interface EncryptionService {
  encrypt(data: string): Promise<string>
  decrypt(encryptedData: string): Promise<string>
}

export interface AuditLogger {
  logDataAccess(log: Omit<DataAccessLog, 'id'>): Promise<void>
}