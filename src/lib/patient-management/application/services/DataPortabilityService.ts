// ============================================================================
// DATA PORTABILITY SERVICE
// Service for handling LGPD data portability requests
// ============================================================================

import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { Patient } from '../../domain/entities/Patient'
import { Document } from '../../domain/entities/Document'
import { MedicalRecord } from '../../domain/entities/MedicalRecord'
import { IPatientRepository } from '../../infrastructure/repositories/IPatientRepository'
import { IDocumentRepository } from '../../infrastructure/repositories/IDocumentRepository'
import { IMedicalRecordRepository } from '../../infrastructure/repositories/IMedicalRecordRepository'

export interface PatientDataExport {
  exportId: string
  patientId: PatientId
  exportedAt: Date
  format: ExportFormat
  data: {
    personalInformation: any
    contactInformation: any
    medicalHistory: any[]
    documents: any[]
    statusHistory: any[]
    consentHistory: any[]
    auditTrail: any[]
  }
  metadata: {
    totalRecords: number
    dataTypes: string[]
    exportedBy: UserId
    retentionPeriod: string
    legalBasis: string
  }
}

export interface DataExportRequest {
  patientId: PatientId
  requestedBy: UserId
  format: ExportFormat
  includeDocuments: boolean
  includeMedicalHistory: boolean
  includeAuditTrail: boolean
  dateRange?: {
    from: Date
    to: Date
  }
  reason: string
}

export type ExportFormat = 'json' | 'xml' | 'csv' | 'pdf'

export interface ExportValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  estimatedSize: number
  estimatedProcessingTime: number
}

/**
 * Data Portability Service
 * 
 * Handles LGPD Article 18 data portability requests, allowing patients
 * to receive their personal data in a structured, commonly used format.
 * 
 * Requirements: 5.3, 5.4
 */
export class DataPortabilityService {
  constructor(
    private readonly patientRepository: IPatientRepository,
    private readonly documentRepository: IDocumentRepository,
    private readonly medicalRecordRepository: IMedicalRecordRepository,
    private readonly auditRepository: IAuditRepository,
    private readonly consentRepository: IConsentRepository,
    private readonly statusHistoryRepository: IStatusHistoryRepository,
    private readonly encryptionService: IEncryptionService
  ) {}

  /**
   * Validate data export request
   * @param request - Export request to validate
   * @returns Promise resolving to validation result
   */
  async validateExportRequest(request: DataExportRequest): Promise<ExportValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let estimatedSize = 0
    let estimatedProcessingTime = 0

    try {
      // Check if patient exists
      const patient = await this.patientRepository.findById(request.patientId)
      if (!patient) {
        errors.push('Patient not found')
        return {
          isValid: false,
          errors,
          warnings,
          estimatedSize: 0,
          estimatedProcessingTime: 0
        }
      }

      // Validate date range
      if (request.dateRange) {
        if (request.dateRange.from > request.dateRange.to) {
          errors.push('Invalid date range: from date must be before to date')
        }
        
        const maxRangeYears = 10
        const yearsDiff = (request.dateRange.to.getTime() - request.dateRange.from.getTime()) / (1000 * 60 * 60 * 24 * 365)
        if (yearsDiff > maxRangeYears) {
          warnings.push(`Large date range (${Math.round(yearsDiff)} years) may result in slow processing`)
        }
      }

      // Estimate data size
      if (request.includeDocuments) {
        const documents = await this.documentRepository.findByPatientId(request.patientId)
        estimatedSize += documents.reduce((total, doc) => total + (doc.fileSize || 0), 0)
        estimatedProcessingTime += documents.length * 100 // 100ms per document
      }

      if (request.includeMedicalHistory) {
        const medicalRecords = await this.medicalRecordRepository.findByPatientId(request.patientId)
        estimatedSize += medicalRecords.length * 1024 // Estimate 1KB per record
        estimatedProcessingTime += medicalRecords.length * 50 // 50ms per record
      }

      if (request.includeAuditTrail) {
        // Estimate audit trail size (could be large)
        estimatedSize += 10 * 1024 * 1024 // Estimate 10MB for audit trail
        estimatedProcessingTime += 5000 // 5 seconds for audit processing
        warnings.push('Including audit trail may significantly increase export size and processing time')
      }

      // Check size limits
      const maxSizeBytes = 100 * 1024 * 1024 // 100MB limit
      if (estimatedSize > maxSizeBytes) {
        errors.push(`Estimated export size (${Math.round(estimatedSize / 1024 / 1024)}MB) exceeds maximum allowed size (100MB)`)
      }

      // Check processing time limits
      const maxProcessingTimeMs = 30 * 60 * 1000 // 30 minutes
      if (estimatedProcessingTime > maxProcessingTimeMs) {
        warnings.push(`Estimated processing time (${Math.round(estimatedProcessingTime / 1000 / 60)} minutes) is very long`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        estimatedSize,
        estimatedProcessingTime
      }
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        isValid: false,
        errors,
        warnings,
        estimatedSize: 0,
        estimatedProcessingTime: 0
      }
    }
  }

  /**
   * Export patient data according to LGPD requirements
   * @param request - Data export request
   * @returns Promise resolving to exported patient data
   */
  async exportPatientData(request: DataExportRequest): Promise<PatientDataExport> {
    try {
      // Validate request first
      const validation = await this.validateExportRequest(request)
      if (!validation.isValid) {
        throw new Error(`Export validation failed: ${validation.errors.join(', ')}`)
      }

      // Get patient data
      const patient = await this.patientRepository.findById(request.patientId)
      if (!patient) {
        throw new Error('Patient not found')
      }

      // Prepare export data structure
      const exportData: PatientDataExport = {
        exportId: this.generateExportId(),
        patientId: request.patientId,
        exportedAt: new Date(),
        format: request.format,
        data: {
          personalInformation: await this.exportPersonalInformation(patient),
          contactInformation: await this.exportContactInformation(patient),
          medicalHistory: [],
          documents: [],
          statusHistory: [],
          consentHistory: [],
          auditTrail: []
        },
        metadata: {
          totalRecords: 0,
          dataTypes: ['personal_information', 'contact_information'],
          exportedBy: request.requestedBy,
          retentionPeriod: '7 years (as per healthcare regulations)',
          legalBasis: 'LGPD Article 18 - Data Portability Right'
        }
      }

      // Export medical history if requested
      if (request.includeMedicalHistory) {
        const medicalRecords = await this.medicalRecordRepository.findByPatientId(request.patientId)
        exportData.data.medicalHistory = await Promise.all(
          medicalRecords.map(record => this.exportMedicalRecord(record))
        )
        exportData.metadata.dataTypes.push('medical_history')
        exportData.metadata.totalRecords += medicalRecords.length
      }

      // Export documents if requested
      if (request.includeDocuments) {
        const documents = await this.documentRepository.findByPatientId(request.patientId)
        exportData.data.documents = await Promise.all(
          documents.map(doc => this.exportDocument(doc, request.format))
        )
        exportData.metadata.dataTypes.push('documents')
        exportData.metadata.totalRecords += documents.length
      }

      // Export status history
      const statusHistory = await this.statusHistoryRepository.findByPatientId(request.patientId)
      exportData.data.statusHistory = statusHistory.map(status => ({
        fromStatus: status.fromStatus,
        toStatus: status.toStatus,
        changedAt: status.changedAt,
        reason: status.reason,
        changedBy: status.changedBy
      }))
      exportData.metadata.dataTypes.push('status_history')
      exportData.metadata.totalRecords += statusHistory.length

      // Export consent history
      const consentHistory = await this.consentRepository.findByPatientId(request.patientId)
      exportData.data.consentHistory = consentHistory.map(consent => ({
        consentType: consent.consentType,
        granted: consent.granted,
        grantedAt: consent.grantedAt,
        withdrawnAt: consent.withdrawnAt,
        legalBasis: consent.legalBasis
      }))
      exportData.metadata.dataTypes.push('consent_history')
      exportData.metadata.totalRecords += consentHistory.length

      // Export audit trail if requested (filtered for patient-related activities)
      if (request.includeAuditTrail) {
        const auditLogs = await this.auditRepository.findByPatientId(
          request.patientId,
          request.dateRange?.from,
          request.dateRange?.to
        )
        exportData.data.auditTrail = auditLogs.map(log => ({
          operation: log.operation,
          dataType: log.dataType,
          timestamp: log.timestamp,
          userId: log.userId,
          accessResult: log.accessResult,
          justification: log.justification
        }))
        exportData.metadata.dataTypes.push('audit_trail')
        exportData.metadata.totalRecords += auditLogs.length
      }

      return exportData
    } catch (error) {
      throw new Error(`Data export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Format exported data according to requested format
   * @param exportData - Raw export data
   * @param format - Desired output format
   * @returns Promise resolving to formatted data string
   */
  async formatExportData(exportData: PatientDataExport, format: ExportFormat): Promise<string> {
    try {
      switch (format) {
        case 'json':
          return JSON.stringify(exportData, null, 2)
        
        case 'xml':
          return this.convertToXML(exportData)
        
        case 'csv':
          return this.convertToCSV(exportData)
        
        case 'pdf':
          return await this.convertToPDF(exportData)
        
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }
    } catch (error) {
      throw new Error(`Data formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate secure download link for exported data
   * @param exportData - Exported data
   * @param expirationHours - Hours until link expires
   * @returns Promise resolving to secure download URL
   */
  async generateSecureDownloadLink(
    exportData: PatientDataExport,
    expirationHours: number = 72
  ): Promise<string> {
    try {
      // Encrypt the export data
      const formattedData = await this.formatExportData(exportData, exportData.format)
      const encryptedData = await this.encryptionService.encrypt(formattedData)
      
      // Store encrypted data with expiration
      const downloadToken = this.generateDownloadToken()
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000)
      
      await this.storeEncryptedExport(downloadToken, encryptedData, expiresAt)
      
      // Generate secure URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evolua.com'
      return `${baseUrl}/api/exports/download/${downloadToken}`
    } catch (error) {
      throw new Error(`Download link generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods

  private async exportPersonalInformation(patient: Patient): Promise<any> {
    return {
      fullName: patient.personalInfo?.fullName?.value || 'N/A',
      dateOfBirth: patient.personalInfo?.dateOfBirth || null,
      gender: patient.personalInfo?.gender?.value || 'N/A',
      cpf: patient.personalInfo?.cpf?.value || 'N/A',
      rg: patient.personalInfo?.rg?.value || 'N/A',
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    }
  }

  private async exportContactInformation(patient: Patient): Promise<any> {
    return {
      primaryPhone: patient.contactInfo?.primaryPhone?.value || 'N/A',
      secondaryPhone: patient.contactInfo?.secondaryPhone?.value || null,
      email: patient.contactInfo?.email?.value || null,
      address: patient.contactInfo?.address ? {
        street: patient.contactInfo.address.street,
        number: patient.contactInfo.address.number,
        complement: patient.contactInfo.address.complement,
        neighborhood: patient.contactInfo.address.neighborhood,
        city: patient.contactInfo.address.city,
        state: patient.contactInfo.address.state,
        zipCode: patient.contactInfo.address.zipCode
      } : null
    }
  }

  private async exportMedicalRecord(record: MedicalRecord): Promise<any> {
    return {
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      diagnosis: record.diagnosis,
      treatmentHistory: record.treatmentHistory,
      medications: record.medications,
      allergies: record.allergies,
      assessments: record.assessments,
      progressNotes: record.progressNotes
    }
  }

  private async exportDocument(document: Document, format: ExportFormat): Promise<any> {
    const baseDocumentInfo = {
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      uploadedAt: document.uploadedAt,
      metadata: document.metadata
    }

    // For PDF exports, include document content as base64
    if (format === 'pdf') {
      try {
        // In a real implementation, you would decrypt and include the file content
        // For now, we'll just include metadata
        return {
          ...baseDocumentInfo,
          note: 'Document content available upon request due to size limitations'
        }
      } catch (error) {
        return {
          ...baseDocumentInfo,
          note: 'Document content could not be included in export'
        }
      }
    }

    return baseDocumentInfo
  }

  private convertToXML(data: PatientDataExport): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<patientDataExport>\n'
    xml += `  <exportId>${data.exportId}</exportId>\n`
    xml += `  <patientId>${data.patientId}</patientId>\n`
    xml += `  <exportedAt>${data.exportedAt.toISOString()}</exportedAt>\n`
    xml += `  <format>${data.format}</format>\n`
    
    xml += '  <personalInformation>\n'
    Object.entries(data.data.personalInformation).forEach(([key, value]) => {
      xml += `    <${key}>${this.escapeXML(String(value))}</${key}>\n`
    })
    xml += '  </personalInformation>\n'
    
    xml += '  <contactInformation>\n'
    Object.entries(data.data.contactInformation).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        xml += `    <${key}>\n`
        Object.entries(value).forEach(([subKey, subValue]) => {
          xml += `      <${subKey}>${this.escapeXML(String(subValue))}</${subKey}>\n`
        })
        xml += `    </${key}>\n`
      } else {
        xml += `    <${key}>${this.escapeXML(String(value))}</${key}>\n`
      }
    })
    xml += '  </contactInformation>\n'
    
    xml += '</patientDataExport>'
    return xml
  }

  private convertToCSV(data: PatientDataExport): string {
    const csvRows: string[] = []
    
    // Add metadata header
    csvRows.push('Export Metadata')
    csvRows.push(`Export ID,${data.exportId}`)
    csvRows.push(`Patient ID,${data.patientId}`)
    csvRows.push(`Exported At,${data.exportedAt.toISOString()}`)
    csvRows.push(`Format,${data.format}`)
    csvRows.push('')
    
    // Add personal information
    csvRows.push('Personal Information')
    csvRows.push('Field,Value')
    Object.entries(data.data.personalInformation).forEach(([key, value]) => {
      csvRows.push(`${key},"${String(value).replace(/"/g, '""')}"`)
    })
    csvRows.push('')
    
    // Add contact information
    csvRows.push('Contact Information')
    csvRows.push('Field,Value')
    Object.entries(data.data.contactInformation).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          csvRows.push(`${key}.${subKey},"${String(subValue).replace(/"/g, '""')}"`)
        })
      } else {
        csvRows.push(`${key},"${String(value).replace(/"/g, '""')}"`)
      }
    })
    
    return csvRows.join('\n')
  }

  private async convertToPDF(data: PatientDataExport): Promise<string> {
    // In a real implementation, you would use a PDF generation library
    // For now, return a placeholder indicating PDF generation is needed
    return JSON.stringify({
      message: 'PDF generation requires additional PDF library implementation',
      data: data,
      note: 'This would be converted to PDF format in production'
    }, null, 2)
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateDownloadToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private async storeEncryptedExport(token: string, encryptedData: string, expiresAt: Date): Promise<void> {
    // Implementation would store encrypted export data with expiration
    console.log(`Storing encrypted export with token: ${token}, expires: ${expiresAt}`)
  }
}

// Supporting interfaces
export interface IAuditRepository {
  findByPatientId(patientId: PatientId, fromDate?: Date, toDate?: Date): Promise<any[]>
}

export interface IConsentRepository {
  findByPatientId(patientId: PatientId): Promise<any[]>
}

export interface IStatusHistoryRepository {
  findByPatientId(patientId: PatientId): Promise<any[]>
}

export interface IEncryptionService {
  encrypt(data: string): Promise<string>
  decrypt(encryptedData: string): Promise<string>
}