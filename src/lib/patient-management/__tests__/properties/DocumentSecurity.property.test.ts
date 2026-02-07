// ============================================================================
// DOCUMENT SECURITY AND VALIDATION PROPERTY TESTS
// Property-based tests for document security and validation
// Feature: patient-management-system, Property 6: Document Security and Validation
// **Validates: Requirements 2.2**
// ============================================================================

import * as fc from 'fast-check'
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
import { DocumentManager, UploadDocumentRequest } from '../../application/services/DocumentManager'
import { patientIdGenerator, userIdGenerator } from '../../testing/generators'

// ============================================================================
// MOCK REPOSITORY
// ============================================================================

class InMemoryDocumentRepository implements IDocumentRepository {
  private documents: Map<string, Document> = new Map()
  private files: Map<string, Blob> = new Map()
  private versions: Map<string, Array<{
    version: number
    filePath: string
    checksum: string
    createdAt: Date
    createdBy: UserId
    changeDescription?: string
  }>> = new Map()

  async create(documentData: CreateDocumentData, uploadedBy: UserId): Promise<Document> {
    // Extract document ID from the file path (format: patients/{patientId}/documents/{documentId}/{fileName})
    const pathParts = documentData.filePath.split('/')
    if (pathParts.length < 5) {
      throw new Error(`Invalid file path format: ${documentData.filePath}. Expected format: patients/{patientId}/documents/{documentId}/{fileName}. Got ${pathParts.length} parts: [${pathParts.join(', ')}]`)
    }
    const documentId = pathParts[3] // The document ID is the 4th part of the path (index 3)
    
    if (!documentId || documentId.trim() === '') {
      throw new Error(`Could not extract document ID from path: ${documentData.filePath}. Path parts: [${pathParts.join(', ')}]`)
    }
    
    const document = Document.create(
      documentId,
      documentData.patientId,
      documentData.fileName,
      documentData.filePath,
      documentData.fileType,
      documentData.fileSize,
      documentData.metadata,
      uploadedBy,
      documentData.checksum
    )
    
    // Verify that the document ID matches what we extracted
    if (document.id !== documentId) {
      throw new Error(`Document ID mismatch after creation: document.id=${document.id}, extracted documentId=${documentId}`)
    }
    
    // Store the document using the document's own ID to ensure consistency
    this.documents.set(document.id, document)
    
    // Verify storage immediately
    const stored = this.documents.get(document.id)
    if (!stored) {
      throw new Error(`Failed to store document with ID ${document.id}. Map size: ${this.documents.size}`)
    }
    
    // Double-check that we can retrieve it
    const retrieved = this.documents.get(document.id)
    if (!retrieved) {
      throw new Error(`Document was stored but cannot be retrieved! ID: ${document.id}`)
    }
    
    return document
  }

  async findById(id: DocumentId): Promise<Document | null> {
    return this.documents.get(id) || null
  }

  async update(id: DocumentId, updates: UpdateDocumentData): Promise<Document> {
    const existing = this.documents.get(id)
    if (!existing) {
      // Debug: log all document IDs in the repository
      const allIds = Array.from(this.documents.keys())
      throw new Error(`Document with ID ${id} not found. Repository contains ${allIds.length} documents with IDs: ${allIds.slice(0, 5).join(', ')}${allIds.length > 5 ? '...' : ''}`)
    }
    
    let updated = existing
    
    if (updates.metadata) {
      updated = updated.updateMetadata(updates.metadata)
    }
    
    if (updates.status) {
      updated = updated.updateStatus(updates.status)
    }
    
    if (updates.securityInfo) {
      updated = updated.updateSecurityInfo(updates.securityInfo)
    }
    
    this.documents.set(id, updated)
    return updated
  }

  async delete(id: DocumentId): Promise<void> {
    const document = this.documents.get(id)
    if (document) {
      this.files.delete(document.filePath)
      this.documents.delete(id)
    }
  }

  async findByPatientId(patientId: PatientId, pagination: PaginationOptions): Promise<PaginatedResult<Document>> {
    const documents = Array.from(this.documents.values())
      .filter(d => d.patientId.value === patientId.value)
    
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = documents.slice(start, end)
    
    return {
      data: paginatedData,
      total: documents.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(documents.length / pagination.limit),
      hasNext: end < documents.length,
      hasPrevious: pagination.page > 1
    }
  }

  async search(criteria: DocumentSearchCriteria, pagination: PaginationOptions): Promise<PaginatedResult<Document>> {
    let documents = Array.from(this.documents.values())
    
    if (criteria.patientId) {
      documents = documents.filter(d => d.patientId.value === criteria.patientId!.value)
    }
    
    if (criteria.documentType) {
      documents = documents.filter(d => d.metadata.documentType === criteria.documentType)
    }
    
    if (criteria.status) {
      documents = documents.filter(d => d.status === criteria.status)
    }
    
    if (criteria.isConfidential !== undefined) {
      documents = documents.filter(d => d.metadata.isConfidential === criteria.isConfidential)
    }
    
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = documents.slice(start, end)
    
    return {
      data: paginatedData,
      total: documents.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(documents.length / pagination.limit),
      hasNext: end < documents.length,
      hasPrevious: pagination.page > 1
    }
  }

  async findByType(documentType: DocumentType, pagination: PaginationOptions): Promise<PaginatedResult<Document>> {
    return this.search({ documentType }, pagination)
  }

  async findByStatus(status: DocumentStatus, pagination: PaginationOptions): Promise<PaginatedResult<Document>> {
    return this.search({ status }, pagination)
  }

  async findExpiredDocuments(pagination: PaginationOptions): Promise<PaginatedResult<Document>> {
    const documents = Array.from(this.documents.values()).filter(d => d.isExpired())
    
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedData = documents.slice(start, end)
    
    return {
      data: paginatedData,
      total: documents.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(documents.length / pagination.limit),
      hasNext: end < documents.length,
      hasPrevious: pagination.page > 1
    }
  }

  async validateDocument(file: File, metadata: DocumentMetadata): Promise<DocumentValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
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
    
    const fileTypeValid = allowedTypes.includes(file.type)
    if (!fileTypeValid) {
      errors.push(`Unsupported file type: ${file.type}`)
    }
    
    // Validate file size (max 50MB)
    const maxSizeBytes = 50 * 1024 * 1024
    const fileSizeValid = file.size > 0 && file.size <= maxSizeBytes
    if (file.size <= 0) {
      errors.push('File size must be greater than 0')
    } else if (file.size > maxSizeBytes) {
      errors.push(`File size exceeds maximum allowed size of ${maxSizeBytes} bytes`)
    }
    
    // Simulate virus scan (in real implementation, this would call an actual scanner)
    // For testing, we'll consider files with "virus" in the name as infected
    const virusScanPassed = !file.name.toLowerCase().includes('virus')
    if (!virusScanPassed) {
      errors.push('Virus detected in file')
    }
    
    // Validate metadata
    if (!metadata.title.trim()) {
      errors.push('Document title cannot be empty')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileTypeValid,
      fileSizeValid,
      virusScanPassed
    }
  }

  async storeFile(file: File, documentId: DocumentId, patientId: PatientId): Promise<{ filePath: string; checksum: string }> {
    const filePath = `patients/${patientId.value}/documents/${documentId}/${file.name}`
    
    // Store file blob
    this.files.set(filePath, file)
    
    // Calculate checksum (simplified for testing)
    const checksum = await this.calculateChecksum(file)
    
    return { filePath, checksum }
  }

  async retrieveFile(filePath: string): Promise<Blob> {
    const file = this.files.get(filePath)
    if (!file) {
      throw new Error(`File not found: ${filePath}`)
    }
    return file
  }

  async encryptFile(filePath: string): Promise<{ encryptionAlgorithm: string; isEncrypted: boolean }> {
    // Simulate encryption
    const file = this.files.get(filePath)
    if (!file) {
      throw new Error(`File not found: ${filePath}`)
    }
    
    // In real implementation, this would actually encrypt the file
    // For testing, we just mark it as encrypted
    return {
      encryptionAlgorithm: 'AES-256-GCM',
      isEncrypted: true
    }
  }

  async performVirusScan(filePath: string): Promise<{ result: 'clean' | 'infected' | 'pending'; scanDate: Date; details?: string }> {
    // Simulate virus scan
    // For testing, files with "virus" in the path are considered infected
    const isInfected = filePath.toLowerCase().includes('virus')
    
    return {
      result: isInfected ? 'infected' : 'clean',
      scanDate: new Date(),
      details: isInfected ? 'Malware detected' : 'No threats found'
    }
  }

  async count(): Promise<number> {
    return this.documents.size
  }

  async countByPatient(patientId: PatientId): Promise<number> {
    return Array.from(this.documents.values()).filter(d => d.patientId.value === patientId.value).length
  }

  async countByStatus(status: DocumentStatus): Promise<number> {
    return Array.from(this.documents.values()).filter(d => d.status === status).length
  }

  async getTotalStorageSize(): Promise<number> {
    return Array.from(this.documents.values()).reduce((sum, d) => sum + d.fileSize, 0)
  }

  async getPatientStorageSize(patientId: PatientId): Promise<number> {
    return Array.from(this.documents.values())
      .filter(d => d.patientId.value === patientId.value)
      .reduce((sum, d) => sum + d.fileSize, 0)
  }

  async createDocumentVersion(
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
  }> {
    const document = this.documents.get(documentId)
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`)
    }
    
    const versions = this.versions.get(documentId) || []
    const newVersion = versions.length + 1
    
    const filePath = `${document.filePath}.v${newVersion}`
    const checksum = await this.calculateChecksum(file)
    
    this.files.set(filePath, file)
    
    const versionData = {
      version: newVersion,
      filePath,
      checksum,
      createdAt: new Date(),
      createdBy: userId,
      changeDescription
    }
    
    versions.push(versionData)
    this.versions.set(documentId, versions)
    
    return versionData
  }

  async getDocumentVersions(documentId: DocumentId): Promise<Array<{
    version: number
    filePath: string
    checksum: string
    createdAt: Date
    createdBy: UserId
    changeDescription?: string
  }>> {
    return this.versions.get(documentId) || []
  }

  async retrieveDocumentVersion(documentId: DocumentId, version: number): Promise<Blob> {
    const versions = this.versions.get(documentId)
    if (!versions) {
      throw new Error(`No versions found for document ${documentId}`)
    }
    
    const versionData = versions.find(v => v.version === version)
    if (!versionData) {
      throw new Error(`Version ${version} not found for document ${documentId}`)
    }
    
    return this.retrieveFile(versionData.filePath)
  }

  private async calculateChecksum(file: File): Promise<string> {
    // Simplified checksum calculation for testing
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let hash = 0
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash) + bytes[i]
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  clear(): void {
    this.documents.clear()
    this.files.clear()
    this.versions.clear()
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const validFileTypeGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom(
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  )

const invalidFileTypeGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom(
    'application/x-executable',
    'application/x-msdownload',
    'application/x-sh',
    'text/x-script.python',
    'application/javascript',
    'text/html'
  )

const documentMetadataGenerator = (): fc.Arbitrary<DocumentMetadata> =>
  fc.record({
    title: fc.string({ minLength: 5, maxLength: 100 })
      .filter(s => s.trim().length >= 5)
      .filter(s => !['constructor', 'prototype', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'].some(keyword => s.toLowerCase().includes(keyword))),
    description: fc.option(
      fc.string({ minLength: 10, maxLength: 200 })
        .filter(s => !['constructor', 'prototype', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'].some(keyword => s.toLowerCase().includes(keyword))),
      { nil: undefined }
    ),
    documentType: fc.constantFrom<DocumentType>(
      DocumentType.MEDICAL_REPORT,
      DocumentType.PRESCRIPTION,
      DocumentType.EXAM_RESULT,
      DocumentType.INSURANCE_CARD,
      DocumentType.IDENTIFICATION,
      DocumentType.CONSENT_FORM,
      DocumentType.TREATMENT_PLAN,
      DocumentType.PROGRESS_NOTE,
      DocumentType.OTHER
    ),
    tags: fc.option(
      fc.array(
        fc.string({ minLength: 3, maxLength: 20 })
          .filter(s => !['constructor', 'prototype', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'].some(keyword => s.toLowerCase().includes(keyword))),
        { minLength: 1, maxLength: 5 }
      ),
      { nil: undefined }
    ),
    version: fc.constant(1),
    isConfidential: fc.boolean(),
    retentionPeriod: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
    legalBasis: fc.option(fc.constantFrom('Consent', 'Legal Obligation', 'Legitimate Interest'), { nil: undefined })
  })

const validFileGenerator = (): fc.Arbitrary<File> =>
  fc.tuple(
    fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.toLowerCase().includes('virus') && s.trim().length >= 5),
    validFileTypeGenerator(),
    fc.integer({ min: 100, max: 1000 }) // Small files: 100 bytes to 1KB for faster tests
  ).map(([name, type, size]) => {
    const content = new Uint8Array(size)
    // Fill with simple pattern instead of random data for speed
    for (let i = 0; i < size; i++) {
      content[i] = i % 256
    }
    return new File([content], name, { type })
  })

const invalidFileGenerator = (): fc.Arbitrary<{ file: File; reason: string }> =>
  fc.oneof(
    // Invalid file type
    fc.tuple(
      fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length >= 5),
      invalidFileTypeGenerator(),
      fc.constant(500) // Small fixed size
    ).map(([name, type, size]) => ({
      file: new File([new Uint8Array(size)], name, { type }),
      reason: 'invalid_type'
    })),
    
    // File too large
    fc.tuple(
      fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length >= 5),
      validFileTypeGenerator()
    ).map(([name, type]) => ({
      file: new File([new Uint8Array(51 * 1024 * 1024)], name, { type }),
      reason: 'too_large'
    })),
    
    // Empty file
    fc.tuple(
      fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length >= 5),
      validFileTypeGenerator()
    ).map(([name, type]) => ({
      file: new File([], name, { type }),
      reason: 'empty'
    })),
    
    // Infected file (simulated by name containing "virus")
    fc.tuple(
      validFileTypeGenerator(),
      fc.constant(500) // Small fixed size
    ).map(([type, size]) => ({
      file: new File([new Uint8Array(size)], 'infected_virus_file.pdf', { type }),
      reason: 'infected'
    }))
  )

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 6: Document Security and Validation', () => {
  let repository: InMemoryDocumentRepository
  let manager: DocumentManager

  beforeEach(() => {
    repository = new InMemoryDocumentRepository()
    manager = new DocumentManager(repository)
  })

  afterAll(() => {
    // Clean up any remaining resources
    if (repository) {
      repository.clear()
    }
  })

  // Note: Not clearing repository in afterEach to avoid interfering with async operations

  test('Property 6.1: Valid documents pass file type validation', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        validFileGenerator(),
        documentMetadataGenerator(),
        userIdGenerator(),
        async (patientId, file, metadata, userId) => {
          // Create fresh repository and manager for each iteration
          const testRepository = new InMemoryDocumentRepository()
          const testManager = new DocumentManager(testRepository)
          
          // Upload document
          const uploadRequest: UploadDocumentRequest = {
            patientId,
            file,
            metadata: {
              ...metadata,
              title: metadata.title.trim()
            }
          }

          const document = await testManager.uploadDocument(uploadRequest, userId)

          // Verify document was created
          expect(document).toBeDefined()
          expect(document.id).toBeDefined()
          
          // Verify file type is valid
          const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain'
          ]
          expect(allowedTypes).toContain(document.fileType)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 6.2: Invalid or unsafe files are rejected during validation', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        invalidFileGenerator(),
        documentMetadataGenerator(),
        userIdGenerator(),
        async (patientId, { file, reason }, metadata, userId) => {
          const uploadRequest: UploadDocumentRequest = {
            patientId,
            file,
            metadata: {
              ...metadata,
              title: metadata.title.trim()
            }
          }

          // Attempt to upload invalid document
          try {
            await manager.uploadDocument(uploadRequest, userId)
            // If we get here, the upload should have failed but didn't
            return false
          } catch (error) {
            // Verify that the error is related to validation
            const errorMessage = error instanceof Error ? error.message : String(error)
            expect(errorMessage).toContain('validation failed')
            return true
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 6.3: Documents undergo security scanning before storage', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        validFileGenerator(),
        documentMetadataGenerator(),
        userIdGenerator(),
        async (patientId, file, metadata, userId) => {
          const uploadRequest: UploadDocumentRequest = {
            patientId,
            file,
            metadata: {
              ...metadata,
              title: metadata.title.trim()
            }
          }

          const document = await manager.uploadDocument(uploadRequest, userId)

          // Wait a bit for async security operations to complete
          await new Promise(resolve => setTimeout(resolve, 50))

          // Retrieve the document to check security info
          const retrievedDocument = await manager.getDocument(document.id)
          expect(retrievedDocument).not.toBeNull()

          if (retrievedDocument) {
            // Verify virus scan was performed
            expect(retrievedDocument.securityInfo.virusScanResult).toBeDefined()
            expect(['clean', 'infected', 'pending']).toContain(retrievedDocument.securityInfo.virusScanResult!)
            
            // Verify scan date is set
            if (retrievedDocument.securityInfo.virusScanResult !== 'pending') {
              expect(retrievedDocument.securityInfo.virusScanDate).toBeDefined()
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 6.4: Documents are encrypted before storage', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        validFileGenerator(),
        documentMetadataGenerator(),
        userIdGenerator(),
        async (patientId, file, metadata, userId) => {
          const uploadRequest: UploadDocumentRequest = {
            patientId,
            file,
            metadata: {
              ...metadata,
              title: metadata.title.trim()
            }
          }

          const document = await manager.uploadDocument(uploadRequest, userId)

          // Wait a bit for async security operations to complete
          await new Promise(resolve => setTimeout(resolve, 50))

          // Retrieve the document to check encryption
          const retrievedDocument = await manager.getDocument(document.id)
          expect(retrievedDocument).not.toBeNull()

          if (retrievedDocument) {
            // Verify encryption was applied
            expect(retrievedDocument.securityInfo.isEncrypted).toBe(true)
            expect(retrievedDocument.securityInfo.encryptionAlgorithm).toBeDefined()
            expect(retrievedDocument.securityInfo.encryptionAlgorithm).toBe('AES-256-GCM')
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 6.5: Document validation is comprehensive and consistent', () => {
    fc.assert(
      fc.asyncProperty(
        validFileGenerator(),
        documentMetadataGenerator(),
        async (file, metadata) => {
          // Validate the document
          const validationResult = await manager.validateDocument({
            file,
            metadata: {
              ...metadata,
              title: metadata.title.trim()
            }
          })

          // Verify validation result structure
          expect(validationResult).toBeDefined()
          expect(typeof validationResult.isValid).toBe('boolean')
          expect(Array.isArray(validationResult.errors)).toBe(true)
          expect(Array.isArray(validationResult.warnings)).toBe(true)
          expect(typeof validationResult.fileTypeValid).toBe('boolean')
          expect(typeof validationResult.fileSizeValid).toBe('boolean')
          expect(typeof validationResult.virusScanPassed).toBe('boolean')

          // For valid files, all checks should pass
          expect(validationResult.isValid).toBe(true)
          expect(validationResult.fileTypeValid).toBe(true)
          expect(validationResult.fileSizeValid).toBe(true)
          expect(validationResult.virusScanPassed).toBe(true)
          expect(validationResult.errors.length).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 6.6: Only validated and secure documents can be accessed', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        validFileGenerator(),
        documentMetadataGenerator(),
        userIdGenerator(),
        async (patientId, file, metadata, userId) => {
          const uploadRequest: UploadDocumentRequest = {
            patientId,
            file,
            metadata: {
              ...metadata,
              title: metadata.title.trim()
            }
          }

          const document = await manager.uploadDocument(uploadRequest, userId)

          // Wait for async security operations
          await new Promise(resolve => setTimeout(resolve, 50))

          // Retrieve the document
          const retrievedDocument = await manager.getDocument(document.id)
          expect(retrievedDocument).not.toBeNull()

          if (retrievedDocument) {
            // Check if document can be accessed
            const canAccess = retrievedDocument.canBeAccessed()
            
            // Document should only be accessible if it's validated and secure
            if (canAccess) {
              expect(retrievedDocument.status).toBe(DocumentStatus.VALIDATED)
              expect(retrievedDocument.isSecure()).toBe(true)
              expect(retrievedDocument.securityInfo.isEncrypted).toBe(true)
              expect(retrievedDocument.securityInfo.virusScanResult).toBe('clean')
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 6.7: Document checksum is calculated and stored for integrity verification', () => {
    fc.assert(
      fc.asyncProperty(
        patientIdGenerator(),
        validFileGenerator(),
        documentMetadataGenerator(),
        userIdGenerator(),
        async (patientId, file, metadata, userId) => {
          const uploadRequest: UploadDocumentRequest = {
            patientId,
            file,
            metadata: {
              ...metadata,
              title: metadata.title.trim()
            }
          }

          const document = await manager.uploadDocument(uploadRequest, userId)

          // Verify checksum is present
          expect(document.securityInfo.checksum).toBeDefined()
          expect(document.securityInfo.checksum.length).toBeGreaterThan(0)

          // Retrieve the document
          const retrievedDocument = await manager.getDocument(document.id)
          expect(retrievedDocument).not.toBeNull()

          if (retrievedDocument) {
            // Verify checksum is preserved
            expect(retrievedDocument.securityInfo.checksum).toBe(document.securityInfo.checksum)
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
