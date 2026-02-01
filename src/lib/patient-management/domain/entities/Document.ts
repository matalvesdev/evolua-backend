// ============================================================================
// DOCUMENT ENTITY
// Domain entity representing a patient document with metadata and security
// ============================================================================

import { PatientId } from '../value-objects/PatientId'
import { UserId } from '../value-objects/UserId'

export type DocumentId = string

export enum DocumentType {
  MEDICAL_REPORT = 'medical_report',
  PRESCRIPTION = 'prescription',
  EXAM_RESULT = 'exam_result',
  INSURANCE_CARD = 'insurance_card',
  IDENTIFICATION = 'identification',
  CONSENT_FORM = 'consent_form',
  TREATMENT_PLAN = 'treatment_plan',
  PROGRESS_NOTE = 'progress_note',
  OTHER = 'other'
}

export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  VALIDATED = 'validated',
  FAILED_VALIDATION = 'failed_validation',
  ARCHIVED = 'archived'
}

export interface DocumentMetadata {
  title: string
  description?: string
  documentType: DocumentType
  tags?: string[]
  version: number
  isConfidential: boolean
  retentionPeriod?: number // in years
  legalBasis?: string // LGPD legal basis
}

export interface DocumentSecurityInfo {
  isEncrypted: boolean
  encryptionAlgorithm?: string
  virusScanResult?: 'clean' | 'infected' | 'pending'
  virusScanDate?: Date
  checksum: string
}

export class Document {
  constructor(
    public readonly id: DocumentId,
    public readonly patientId: PatientId,
    public readonly fileName: string,
    public readonly filePath: string,
    public readonly fileType: string,
    public readonly fileSize: number,
    public readonly metadata: DocumentMetadata,
    public readonly securityInfo: DocumentSecurityInfo,
    public readonly status: DocumentStatus,
    public readonly uploadedAt: Date,
    public readonly uploadedBy: UserId,
    public readonly updatedAt: Date = new Date()
  ) {
    this.validateDocument()
  }

  private validateDocument(): void {
    if (!this.fileName.trim()) {
      throw new Error('Document file name cannot be empty')
    }

    if (!this.filePath.trim()) {
      throw new Error('Document file path cannot be empty')
    }

    if (this.fileSize <= 0) {
      throw new Error('Document file size must be greater than 0')
    }

    if (!this.metadata.title.trim()) {
      throw new Error('Document title cannot be empty')
    }

    if (this.metadata.version < 1) {
      throw new Error('Document version must be at least 1')
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ]

    if (!allowedTypes.includes(this.fileType)) {
      throw new Error(`Unsupported file type: ${this.fileType}`)
    }

    // Validate file size (max 50MB)
    const maxSizeBytes = 50 * 1024 * 1024
    if (this.fileSize > maxSizeBytes) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSizeBytes} bytes`)
    }
  }

  // Domain methods
  updateMetadata(newMetadata: Partial<DocumentMetadata>): Document {
    const updatedMetadata = {
      ...this.metadata,
      ...newMetadata,
      version: this.metadata.version + 1
    }

    return new Document(
      this.id,
      this.patientId,
      this.fileName,
      this.filePath,
      this.fileType,
      this.fileSize,
      updatedMetadata,
      this.securityInfo,
      this.status,
      this.uploadedAt,
      this.uploadedBy,
      new Date()
    )
  }

  updateStatus(newStatus: DocumentStatus): Document {
    return new Document(
      this.id,
      this.patientId,
      this.fileName,
      this.filePath,
      this.fileType,
      this.fileSize,
      this.metadata,
      this.securityInfo,
      newStatus,
      this.uploadedAt,
      this.uploadedBy,
      new Date()
    )
  }

  updateSecurityInfo(newSecurityInfo: Partial<DocumentSecurityInfo>): Document {
    const updatedSecurityInfo = {
      ...this.securityInfo,
      ...newSecurityInfo
    }

    return new Document(
      this.id,
      this.patientId,
      this.fileName,
      this.filePath,
      this.fileType,
      this.fileSize,
      this.metadata,
      updatedSecurityInfo,
      this.status,
      this.uploadedAt,
      this.uploadedBy,
      new Date()
    )
  }

  isValidated(): boolean {
    return this.status === DocumentStatus.VALIDATED
  }

  isSecure(): boolean {
    return this.securityInfo.isEncrypted && 
           this.securityInfo.virusScanResult === 'clean'
  }

  canBeAccessed(): boolean {
    return this.status === DocumentStatus.VALIDATED && this.isSecure()
  }

  getFileExtension(): string {
    const parts = this.fileName.split('.')
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
  }

  isExpired(): boolean {
    if (!this.metadata.retentionPeriod) {
      return false
    }

    const expirationDate = new Date(this.uploadedAt)
    expirationDate.setFullYear(expirationDate.getFullYear() + this.metadata.retentionPeriod)
    
    return new Date() > expirationDate
  }

  shouldBeArchived(): boolean {
    return this.isExpired() || this.status === DocumentStatus.ARCHIVED
  }

  // Static factory methods
  static create(
    id: DocumentId,
    patientId: PatientId,
    fileName: string,
    filePath: string,
    fileType: string,
    fileSize: number,
    metadata: DocumentMetadata,
    uploadedBy: UserId,
    checksum: string
  ): Document {
    const securityInfo: DocumentSecurityInfo = {
      isEncrypted: false, // Will be updated after encryption
      virusScanResult: 'pending',
      checksum
    }

    return new Document(
      id,
      patientId,
      fileName,
      filePath,
      fileType,
      fileSize,
      metadata,
      securityInfo,
      DocumentStatus.UPLOADING,
      new Date(),
      uploadedBy
    )
  }
}