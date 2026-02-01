// ============================================================================
// DOCUMENT REPOSITORY INTERFACE
// Defines the contract for document data persistence operations
// ============================================================================

import { Document, DocumentId, DocumentMetadata, DocumentStatus, DocumentType } from '../../domain/entities/Document'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'

// Document creation data
export interface CreateDocumentData {
  patientId: PatientId
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  metadata: DocumentMetadata
  checksum: string
}

// Document update data (partial)
export interface UpdateDocumentData {
  metadata?: Partial<DocumentMetadata>
  status?: DocumentStatus
  securityInfo?: {
    isEncrypted?: boolean
    encryptionAlgorithm?: string
    virusScanResult?: 'clean' | 'infected' | 'pending'
    virusScanDate?: Date
    checksum?: string
  }
}

// Document search criteria
export interface DocumentSearchCriteria {
  patientId?: PatientId
  documentType?: DocumentType
  status?: DocumentStatus
  isConfidential?: boolean
  uploadedAfter?: Date
  uploadedBefore?: Date
  tags?: string[]
  query?: string // Search in title and description
}

// Pagination parameters
export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: 'fileName' | 'uploadedAt' | 'updatedAt' | 'fileSize'
  sortOrder?: 'asc' | 'desc'
}

// Paginated result wrapper
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Document validation result
export interface DocumentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fileTypeValid: boolean
  fileSizeValid: boolean
  virusScanPassed: boolean
}

/**
 * Document Repository Interface
 * 
 * Defines the contract for document data persistence operations.
 * Implementations should handle secure file storage, validation,
 * encryption, and maintain audit trails for all operations.
 * 
 * Requirements: 2.2, 2.4
 */
export interface IDocumentRepository {
  /**
   * Create a new document record
   * @param documentData - Document data for creation
   * @param uploadedBy - ID of the user uploading the document
   * @returns Promise resolving to the created Document entity
   * @throws Error if validation fails or creation is unsuccessful
   */
  create(documentData: CreateDocumentData, uploadedBy: UserId): Promise<Document>

  /**
   * Retrieve a document by ID
   * @param id - Document ID
   * @returns Promise resolving to Document entity or null if not found
   */
  findById(id: DocumentId): Promise<Document | null>

  /**
   * Update an existing document
   * @param id - Document ID
   * @param updates - Partial document data for update
   * @returns Promise resolving to updated Document entity
   * @throws Error if document not found or update fails
   */
  update(id: DocumentId, updates: UpdateDocumentData): Promise<Document>

  /**
   * Delete a document record and associated file
   * @param id - Document ID
   * @returns Promise resolving when deletion is complete
   * @throws Error if document not found or deletion fails
   */
  delete(id: DocumentId): Promise<void>

  /**
   * Find all documents for a specific patient
   * @param patientId - Patient ID
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  findByPatientId(
    patientId: PatientId,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>>

  /**
   * Search documents with criteria and pagination
   * @param criteria - Search criteria
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated search results
   */
  search(
    criteria: DocumentSearchCriteria,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>>

  /**
   * Find documents by type
   * @param documentType - Document type to filter by
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  findByType(
    documentType: DocumentType,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>>

  /**
   * Find documents by status
   * @param status - Document status to filter by
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  findByStatus(
    status: DocumentStatus,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>>

  /**
   * Find expired documents that should be archived
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  findExpiredDocuments(
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>>

  /**
   * Validate a document file before storage
   * @param file - File to validate
   * @param metadata - Document metadata
   * @returns Promise resolving to validation result
   */
  validateDocument(
    file: File,
    metadata: DocumentMetadata
  ): Promise<DocumentValidationResult>

  /**
   * Store a document file securely
   * @param file - File to store
   * @param documentId - Document ID for file naming
   * @param patientId - Patient ID for folder organization
   * @returns Promise resolving to file path and checksum
   */
  storeFile(
    file: File,
    documentId: DocumentId,
    patientId: PatientId
  ): Promise<{ filePath: string; checksum: string }>

  /**
   * Retrieve a document file
   * @param filePath - Path to the file
   * @returns Promise resolving to file data
   */
  retrieveFile(filePath: string): Promise<Blob>

  /**
   * Encrypt a document file
   * @param filePath - Path to the file to encrypt
   * @returns Promise resolving to encryption details
   */
  encryptFile(filePath: string): Promise<{
    encryptionAlgorithm: string
    isEncrypted: boolean
  }>

  /**
   * Perform virus scan on a document file
   * @param filePath - Path to the file to scan
   * @returns Promise resolving to scan result
   */
  performVirusScan(filePath: string): Promise<{
    result: 'clean' | 'infected' | 'pending'
    scanDate: Date
    details?: string
  }>

  /**
   * Get total count of documents
   * @returns Promise resolving to total document count
   */
  count(): Promise<number>

  /**
   * Get count of documents by patient
   * @param patientId - Patient ID
   * @returns Promise resolving to count
   */
  countByPatient(patientId: PatientId): Promise<number>

  /**
   * Get count of documents by status
   * @param status - Status to count
   * @returns Promise resolving to count
   */
  countByStatus(status: DocumentStatus): Promise<number>

  /**
   * Get total storage size used by documents
   * @returns Promise resolving to total size in bytes
   */
  getTotalStorageSize(): Promise<number>

  /**
   * Get storage size used by a specific patient's documents
   * @param patientId - Patient ID
   * @returns Promise resolving to size in bytes
   */
  getPatientStorageSize(patientId: PatientId): Promise<number>

  /**
   * Create a new version of an existing document
   * @param documentId - Document ID
   * @param file - New file version
   * @param userId - User creating the version
   * @param changeDescription - Optional description of changes
   * @returns Promise resolving to version information
   */
  createDocumentVersion(
    documentId: DocumentId,
    file: File,
    userId: UserId,
    changeDescription?: string
  ): Promise<{
    version: number
    filePath: string
    checksum: string
    createdAt: Date
    createdBy: UserId
    changeDescription?: string
  }>

  /**
   * Get all versions of a document
   * @param documentId - Document ID
   * @returns Promise resolving to array of document versions
   */
  getDocumentVersions(documentId: DocumentId): Promise<Array<{
    version: number
    filePath: string
    checksum: string
    createdAt: Date
    createdBy: UserId
    changeDescription?: string
  }>>

  /**
   * Retrieve a specific version of a document
   * @param documentId - Document ID
   * @param version - Version number
   * @returns Promise resolving to file blob
   */
  retrieveDocumentVersion(documentId: DocumentId, version: number): Promise<Blob>
}