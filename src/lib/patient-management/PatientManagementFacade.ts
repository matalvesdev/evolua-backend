// ============================================================================
// PATIENT MANAGEMENT FACADE
// Simplified API for common patient management operations
// ============================================================================

import { PatientManagementContainer } from './infrastructure/factories/PatientManagementContainer'
import type { Patient } from './domain/entities/Patient'
import type { MedicalRecord } from './domain/entities/MedicalRecord'
import type { Document } from './domain/entities/Document'
import type { CreatePatientData, UpdatePatientData, SearchCriteria, PaginatedResult } from './infrastructure/repositories/IPatientRepository'
import type { CreateMedicalRecordRequest, UpdateMedicalRecordRequest } from './infrastructure/repositories/IMedicalRecordRepository'
import type { PatientStatusType } from './domain/value-objects/PatientStatus'
import type { AdvancedSearchCriteria } from './application/services/AdvancedSearchService'
import type { DataExportRequest } from './application/services/DataPortabilityService'
import type { DataDeletionRequest } from './application/services/DataDeletionService'
import { PatientId } from './domain/value-objects/PatientId'
import { UserId } from './domain/value-objects/UserId'
import { DocumentId } from './domain/entities/Document'

/**
 * Facade providing a simplified, unified API for patient management operations
 * This is the recommended entry point for most application code
 */
export class PatientManagementFacade {
  private container: PatientManagementContainer

  constructor(container?: PatientManagementContainer) {
    this.container = container || PatientManagementContainer.getInstance()
  }

  // ============================================================================
  // PATIENT OPERATIONS
  // ============================================================================

  /**
   * Register a new patient
   */
  async registerPatient(patientData: CreatePatientData, userId: string): Promise<Patient> {
    return this.container.patientRegistry.createPatient(patientData, new UserId(userId))
  }

  /**
   * Update patient information
   */
  async updatePatient(patientId: string, updates: UpdatePatientData, userId: string): Promise<Patient> {
    return this.container.patientRegistry.updatePatient(new PatientId(patientId), updates, new UserId(userId))
  }

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<Patient | null> {
    return this.container.patientRegistry.getPatient(new PatientId(patientId))
  }

  /**
   * Search patients with basic criteria
   */
  async searchPatients(criteria: SearchCriteria): Promise<PaginatedResult<Patient>> {
    return this.container.patientRegistry.searchPatients(criteria)
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(criteria: AdvancedSearchCriteria) {
    return this.container.advancedSearchService.search(criteria)
  }

  /**
   * Delete patient (soft delete with LGPD compliance)
   */
  async deletePatient(patientId: string, userId: string): Promise<void> {
    return this.container.patientRegistry.deletePatient(new PatientId(patientId), new UserId(userId))
  }

  /**
   * Merge duplicate patients
   */
  async mergePatients(primaryId: string, duplicateId: string, userId: string): Promise<Patient> {
    return this.container.patientRegistry.mergePatients(
      new PatientId(primaryId),
      new PatientId(duplicateId),
      new UserId(userId)
    )
  }

  // ============================================================================
  // PATIENT STATUS OPERATIONS
  // ============================================================================

  /**
   * Update patient status
   */
  async updatePatientStatus(
    patientId: string,
    newStatus: PatientStatusType,
    userId: string,
    reason?: string
  ): Promise<void> {
    await this.container.statusTracker.changePatientStatus({
      patientId: new PatientId(patientId),
      newStatus,
      reason,
      userId: new UserId(userId)
    })
  }

  /**
   * Get patient status history
   */
  async getStatusHistory(patientId: string) {
    return this.container.statusTracker.getPatientStatusHistory(new PatientId(patientId))
  }

  /**
   * Get patients by status
   */
  async getPatientsByStatus(status: PatientStatusType): Promise<Patient[]> {
    return this.container.statusTracker.getPatientsByStatus(status)
  }

  // ============================================================================
  // MEDICAL RECORD OPERATIONS
  // ============================================================================

  /**
   * Create medical record for patient
   */
  async createMedicalRecord(
    patientId: string,
    recordData: CreateMedicalRecordRequest,
    userId: string
  ): Promise<MedicalRecord> {
    return this.container.medicalRecordManager.createMedicalRecord(patientId, recordData, new UserId(userId))
  }

  /**
   * Update medical record
   */
  async updateMedicalRecord(
    recordId: string,
    updates: UpdateMedicalRecordRequest,
    userId: string
  ): Promise<MedicalRecord> {
    return this.container.medicalRecordManager.updateMedicalRecord(recordId, updates, new UserId(userId))
  }

  /**
   * Get medical history for patient
   */
  async getMedicalHistory(patientId: string): Promise<MedicalRecord[]> {
    return this.container.medicalRecordManager.getMedicalHistory(new PatientId(patientId))
  }

  /**
   * Get treatment timeline for patient
   */
  async getTreatmentTimeline(patientId: string) {
    return this.container.medicalRecordManager.getTimelineView(new PatientId(patientId))
  }

  // ============================================================================
  // DOCUMENT OPERATIONS
  // ============================================================================

  /**
   * Upload document for patient
   */
  async uploadDocument(
    patientId: string,
    file: File,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<Document> {
    return this.container.documentManager.uploadDocument({
      patientId: new PatientId(patientId),
      file,
      metadata: metadata as any
    }, new UserId(userId))
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    return this.container.documentManager.getDocument(new DocumentId(documentId))
  }

  /**
   * List documents for patient
   */
  async listDocuments(patientId: string): Promise<Document[]> {
    const result = await this.container.documentManager.getPatientDocuments(
      new PatientId(patientId),
      { page: 1, limit: 100 }
    )
    return result.data
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    return this.container.documentManager.deleteDocument(new DocumentId(documentId), new UserId(userId))
  }

  // ============================================================================
  // LGPD COMPLIANCE OPERATIONS
  // ============================================================================

  /**
   * Record patient consent
   */
  async recordConsent(
    patientId: string,
    consentType: string,
    granted: boolean,
    userId: string
  ): Promise<void> {
    await this.container.lgpdComplianceEngine.recordConsent(
      new PatientId(patientId),
      consentType as any,
      granted,
      new UserId(userId)
    )
  }

  /**
   * Check data access authorization
   */
  async checkDataAccess(
    userId: string,
    patientId: string,
    operation: string
  ): Promise<boolean> {
    return this.container.lgpdComplianceEngine.checkDataAccess(
      new UserId(userId),
      new PatientId(patientId),
      operation as any
    )
  }

  /**
   * Process data portability request
   */
  async processDataPortabilityRequest(request: DataExportRequest) {
    return this.container.dataPortabilityService.exportPatientData(request)
  }

  /**
   * Process data deletion request
   */
  async processDataDeletionRequest(request: DataDeletionRequest) {
    return this.container.dataDeletionService.deletionPatientData(request)
  }

  // ============================================================================
  // INTEGRATION OPERATIONS
  // ============================================================================

  /**
   * Link patient to appointment
   */
  async linkPatientToAppointment(patientId: string, appointmentId: string, userId: string): Promise<void> {
    return this.container.integrationHub.linkPatientToAppointment(
      new PatientId(patientId),
      appointmentId,
      new UserId(userId)
    )
  }

  /**
   * Get patient appointments
   */
  async getPatientAppointments(patientId: string) {
    return this.container.integrationHub.getAppointmentsForPatient(new PatientId(patientId))
  }

  /**
   * Generate patient report data
   */
  async getPatientDataForReport(patientId: string, reportType: string) {
    return this.container.integrationHub.getPatientDataForReport(
      new PatientId(patientId),
      reportType as any
    )
  }

  /**
   * Generate patient summary
   */
  async generatePatientSummary(patientId: string) {
    return this.container.integrationHub.generatePatientSummary(new PatientId(patientId))
  }

  // ============================================================================
  // VALIDATION OPERATIONS
  // ============================================================================

  /**
   * Validate patient data
   */
  async validatePatientData(patientData: Record<string, unknown>) {
    return this.container.dataValidationService.validatePatientData(patientData as any)
  }

  /**
   * Check referential integrity
   */
  async checkReferentialIntegrity(patientId: string) {
    return this.container.dataValidationService.checkReferentialIntegrity(new PatientId(patientId))
  }

  // ============================================================================
  // AUDIT AND SECURITY OPERATIONS
  // ============================================================================

  /**
   * Get audit logs for patient
   */
  async getAuditLogs(patientId: string) {
    return this.container.auditLogger.queryAuditLogs({
      patientId: new PatientId(patientId),
      limit: 100
    })
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(filters: Record<string, unknown>) {
    return this.container.auditReportingService.generateReport(
      'compliance' as any,
      filters as any
    )
  }

  /**
   * Get security dashboard
   */
  async getSecurityDashboard() {
    return this.container.securityMonitoringService.getSecurityDashboard()
  }

  // ============================================================================
  // SYSTEM OPERATIONS
  // ============================================================================

  /**
   * Health check for all services
   */
  async healthCheck() {
    return this.container.healthCheck()
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus() {
    return this.container.integrationHub.checkIntegrationHealth()
  }
}
