// ============================================================================
// DOCUMENT MANAGER SERVICE
// Service layer that orchestrates document business logic operations
// ============================================================================

import { Document, DocumentId, DocumentType, DocumentStatus, DocumentMetadata } from '../../domain/entities/Document'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import { 
  IDocumentRepository,
  CreateDocumentData,
  UpdateDocumentData,
  DocumentSearchCriteria,
  PaginationOptions,
  PaginatedResult,
  DocumentValidationResult
} from '../../infrastructure/repositories/IDocumentRepository'

// Request/Response DTOs for the service layer
export interface UploadDocumentRequest {
  patientId: PatientId
  file: File
  metadata: {
    title: string
    description?: string
    documentType: DocumentType
    tags?: string[]
    isConfidential: boolean
    retentionPeriod?: number
    legalBasis?: string
  }
}

export interface UpdateDocumentRequest {
  documentId: DocumentId
  metadata?: Partial<DocumentMetadata>
  status?: DocumentStatus
}

export interface DocumentSearchRequest {
  patientId?: PatientId
  documentType?: DocumentType
  status?: DocumentStatus
  isConfidential?: boolean
  uploadedAfter?: Date
  uploadedBefore?: Date
  tags?: string[]
  query?: string
  pagination: PaginationOptions
}

export interface DocumentValidationRequest {
  file: File
  metadata: DocumentMetadata
}

export interface DocumentDownloadRequest {
  documentId: DocumentId
  userId: UserId
}

export interface DocumentVersionRequest {
  documentId: DocumentId
  file: File
  changeDescription?: string
}

export interface DocumentVersionResponse {
  version: number
  filePath: string
  checksum: string
  createdAt: Date
  createdBy: UserId
  changeDescription?: string
}

export interface BulkDocumentOperationRequest {
  documentIds: DocumentId[]
  operation: 'archive' | 'delete' | 'encrypt'
  userId: UserId
}

export interface DocumentStatistics {
  totalDocuments: number
  documentsByType: Record<DocumentType, number>
  documentsByStatus: Record<DocumentStatus, number>
  totalStorageSize: number
  averageFileSize: number
  documentsUploadedThisMonth: number
  expiredDocuments: number
}

/**
 * Document Manager Service
 * 
 * Orchestrates document management operations including upload, validation,
 * storage, retrieval, and lifecycle management. Ensures security, compliance,
 * and proper audit trails for all document operations.
 * 
 * Requirements: 2.2, 2.4
 */
export class DocumentManager {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  /**
   * Upload and store a new document
   * @param request - Document upload request
   * @param uploadedBy - ID of the user uploading the document
   * @returns Promise resolving to the created Document entity
   */
  async uploadDocument(request: UploadDocumentRequest, uploadedBy: UserId): Promise<Document> {
    try {
      // Step 1: Validate the document
      const validationResult = await this.validateDocument({
        file: request.file,
        metadata: {
          ...request.metadata,
          version: 1
        }
      })

      if (!validationResult.isValid) {
        throw new Error(`Document validation failed: ${validationResult.errors.join(', ')}`)
      }

      // Step 2: Store the file securely
      const documentId = this.generateDocumentId()
      const { filePath, checksum } = await this.documentRepository.storeFile(
        request.file,
        documentId,
        request.patientId
      )

      // Step 3: Create document record
      const documentData: CreateDocumentData = {
        patientId: request.patientId,
        fileName: request.file.name,
        filePath,
        fileType: request.file.type,
        fileSize: request.file.size,
        metadata: {
          ...request.metadata,
          version: 1
        },
        checksum
      }

      let document = await this.documentRepository.create(documentData, uploadedBy)

      // Step 4: Perform security operations asynchronously
      await this.performSecurityOperations(document)

      return document
    } catch (error) {
      throw new Error(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate a document before upload
   * @param request - Document validation request
   * @returns Promise resolving to validation result
   */
  async validateDocument(request: DocumentValidationRequest): Promise<DocumentValidationResult> {
    try {
      return await this.documentRepository.validateDocument(request.file, request.metadata)
    } catch (error) {
      throw new Error(`Document validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieve a document by ID
   * @param documentId - Document ID
   * @returns Promise resolving to Document entity or null if not found
   */
  async getDocument(documentId: DocumentId): Promise<Document | null> {
    try {
      return await this.documentRepository.findById(documentId)
    } catch (error) {
      throw new Error(`Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update document metadata or status
   * @param request - Document update request
   * @returns Promise resolving to updated Document entity
   */
  async updateDocument(request: UpdateDocumentRequest): Promise<Document> {
    try {
      const updateData: UpdateDocumentData = {}

      if (request.metadata) {
        updateData.metadata = request.metadata
      }

      if (request.status) {
        updateData.status = request.status
      }

      return await this.documentRepository.update(request.documentId, updateData)
    } catch (error) {
      throw new Error(`Document update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a document
   * @param documentId - Document ID
   * @param userId - ID of the user performing the deletion
   * @returns Promise resolving when deletion is complete
   */
  async deleteDocument(documentId: DocumentId, userId: UserId): Promise<void> {
    try {
      // Verify document exists and user has permission
      const document = await this.documentRepository.findById(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // TODO: Add authorization check here
      // await this.checkDeletePermission(document, userId)

      await this.documentRepository.delete(documentId)
    } catch (error) {
      throw new Error(`Document deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search documents with criteria
   * @param request - Document search request
   * @returns Promise resolving to paginated search results
   */
  async searchDocuments(request: DocumentSearchRequest): Promise<PaginatedResult<Document>> {
    try {
      const criteria: DocumentSearchCriteria = {
        patientId: request.patientId,
        documentType: request.documentType,
        status: request.status,
        isConfidential: request.isConfidential,
        uploadedAfter: request.uploadedAfter,
        uploadedBefore: request.uploadedBefore,
        tags: request.tags,
        query: request.query
      }

      return await this.documentRepository.search(criteria, request.pagination)
    } catch (error) {
      throw new Error(`Document search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all documents for a specific patient
   * @param patientId - Patient ID
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated results
   */
  async getPatientDocuments(
    patientId: PatientId,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    try {
      return await this.documentRepository.findByPatientId(patientId, pagination)
    } catch (error) {
      throw new Error(`Patient documents retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Download a document file
   * @param request - Document download request
   * @returns Promise resolving to file blob
   */
  async downloadDocument(request: DocumentDownloadRequest): Promise<Blob> {
    try {
      // Get document metadata
      const document = await this.documentRepository.findById(request.documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // Check if document can be accessed
      if (!document.canBeAccessed()) {
        throw new Error('Document cannot be accessed due to security or validation issues')
      }

      // TODO: Add authorization check here
      // await this.checkDownloadPermission(document, request.userId)

      // Retrieve file
      return await this.documentRepository.retrieveFile(document.filePath)
    } catch (error) {
      throw new Error(`Document download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Archive expired documents
   * @param userId - ID of the user performing the operation
   * @returns Promise resolving to number of archived documents
   */
  async archiveExpiredDocuments(userId: UserId): Promise<number> {
    try {
      const pagination: PaginationOptions = { page: 1, limit: 100 }
      const expiredDocuments = await this.documentRepository.findExpiredDocuments(pagination)
      
      let archivedCount = 0
      for (const document of expiredDocuments.data) {
        if (!document.shouldBeArchived()) {
          continue
        }

        await this.documentRepository.update(document.id, {
          status: DocumentStatus.ARCHIVED
        })
        archivedCount++
      }

      return archivedCount
    } catch (error) {
      throw new Error(`Document archiving failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Perform bulk operations on multiple documents
   * @param request - Bulk operation request
   * @returns Promise resolving to operation results
   */
  async performBulkOperation(request: BulkDocumentOperationRequest): Promise<{
    successful: DocumentId[]
    failed: { documentId: DocumentId; error: string }[]
  }> {
    const successful: DocumentId[] = []
    const failed: { documentId: DocumentId; error: string }[] = []

    for (const documentId of request.documentIds) {
      try {
        switch (request.operation) {
          case 'archive':
            await this.documentRepository.update(documentId, {
              status: DocumentStatus.ARCHIVED
            })
            break
          case 'delete':
            await this.documentRepository.delete(documentId)
            break
          case 'encrypt':
            const document = await this.documentRepository.findById(documentId)
            if (document) {
              await this.encryptDocument(document)
            }
            break
        }
        successful.push(documentId)
      } catch (error) {
        failed.push({
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return { successful, failed }
  }

  /**
   * Create a new version of an existing document
   * @param request - Document version request
   * @param userId - ID of the user creating the version
   * @returns Promise resolving to the version information
   */
  async createDocumentVersion(request: DocumentVersionRequest, userId: UserId): Promise<DocumentVersionResponse> {
    try {
      // Delegate to repository for version creation
      const versionData = await this.documentRepository.createDocumentVersion(
        request.documentId,
        request.file,
        userId,
        request.changeDescription
      )

      return {
        version: versionData.version,
        filePath: versionData.filePath,
        checksum: versionData.checksum,
        createdAt: versionData.createdAt,
        createdBy: versionData.createdBy,
        changeDescription: versionData.changeDescription
      }
    } catch (error) {
      throw new Error(`Document version creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all versions of a document
   * @param documentId - Document ID
   * @returns Promise resolving to array of document versions
   */
  async getDocumentVersions(documentId: DocumentId): Promise<DocumentVersionResponse[]> {
    try {
      const versions = await this.documentRepository.getDocumentVersions(documentId)
      
      return versions.map(version => ({
        version: version.version,
        filePath: version.filePath,
        checksum: version.checksum,
        createdAt: version.createdAt,
        createdBy: version.createdBy,
        changeDescription: version.changeDescription
      }))
    } catch (error) {
      throw new Error(`Document versions retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Download a specific version of a document
   * @param documentId - Document ID
   * @param version - Version number
   * @returns Promise resolving to file blob
   */
  async downloadDocumentVersion(documentId: DocumentId, version: number): Promise<Blob> {
    try {
      return await this.documentRepository.retrieveDocumentVersion(documentId, version)
    } catch (error) {
      throw new Error(`Document version download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  async getDocumentStatistics(patientId?: PatientId): Promise<DocumentStatistics> {
    try {
      const totalDocuments = patientId 
        ? await this.documentRepository.countByPatient(patientId)
        : await this.documentRepository.count()

      const totalStorageSize = patientId
        ? await this.documentRepository.getPatientStorageSize(patientId)
        : await this.documentRepository.getTotalStorageSize()

      // Get documents by type and status
      const documentsByType: Record<DocumentType, number> = {} as any
      const documentsByStatus: Record<DocumentStatus, number> = {} as any

      // This is a simplified implementation - in a real scenario,
      // you'd want to optimize these queries
      for (const type of Object.values(DocumentType)) {
        const count = await this.documentRepository.search(
          { documentType: type, patientId },
          { page: 1, limit: 1 }
        )
        documentsByType[type] = count.total
      }

      for (const status of Object.values(DocumentStatus)) {
        const count = await this.documentRepository.search(
          { status, patientId },
          { page: 1, limit: 1 }
        )
        documentsByStatus[status] = count.total
      }

      // Calculate this month's uploads
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const thisMonthCount = await this.documentRepository.search(
        { uploadedAfter: thisMonth, patientId },
        { page: 1, limit: 1 }
      )

      // Get expired documents count
      const expiredCount = await this.documentRepository.findExpiredDocuments(
        { page: 1, limit: 1 }
      )

      return {
        totalDocuments,
        documentsByType,
        documentsByStatus,
        totalStorageSize,
        averageFileSize: totalDocuments > 0 ? totalStorageSize / totalDocuments : 0,
        documentsUploadedThisMonth: thisMonthCount.total,
        expiredDocuments: expiredCount.total
      }
    } catch (error) {
      throw new Error(`Statistics retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods
  private generateDocumentId(): DocumentId {
    return crypto.randomUUID()
  }

  private async performSecurityOperations(document: Document): Promise<void> {
    try {
      // Perform virus scan
      const scanResult = await this.documentRepository.performVirusScan(document.filePath)
      
      // Encrypt the file
      const encryptionResult = await this.documentRepository.encryptFile(document.filePath)

      // Update document with security information
      await this.documentRepository.update(document.id, {
        securityInfo: {
          isEncrypted: encryptionResult.isEncrypted,
          encryptionAlgorithm: encryptionResult.encryptionAlgorithm,
          virusScanResult: scanResult.result,
          virusScanDate: scanResult.scanDate,
          checksum: document.securityInfo.checksum
        },
        status: scanResult.result === 'clean' ? DocumentStatus.VALIDATED : DocumentStatus.FAILED_VALIDATION
      })
    } catch (error) {
      // Update document status to failed if security operations fail
      await this.documentRepository.update(document.id, {
        status: DocumentStatus.FAILED_VALIDATION
      })
      throw error
    }
  }

  private async encryptDocument(document: Document): Promise<void> {
    const encryptionResult = await this.documentRepository.encryptFile(document.filePath)
    
    await this.documentRepository.update(document.id, {
      securityInfo: {
        ...document.securityInfo,
        isEncrypted: encryptionResult.isEncrypted,
        encryptionAlgorithm: encryptionResult.encryptionAlgorithm
      }
    })
  }
}