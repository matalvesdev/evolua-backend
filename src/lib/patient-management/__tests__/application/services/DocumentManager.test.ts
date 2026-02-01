// ============================================================================
// DOCUMENT MANAGER SERVICE UNIT TESTS
// Unit tests for the Document Manager application service
// ============================================================================

import { DocumentManager, UploadDocumentRequest, UpdateDocumentRequest, DocumentSearchRequest } from '../../../application/services/DocumentManager'
import { Document, DocumentType, DocumentStatus } from '../../../domain/entities/Document'
import { IDocumentRepository, DocumentValidationResult } from '../../../infrastructure/repositories/IDocumentRepository'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { UserId } from '../../../domain/value-objects/UserId'

// Mock implementation of IDocumentRepository
class MockDocumentRepository implements IDocumentRepository {
  private documents: Map<string, Document> = new Map()
  private nextId = 1

  async create(documentData: any, uploadedBy: UserId): Promise<Document> {
    const id = `doc-${this.nextId++}`
    const document = new Document(
      id,
      documentData.patientId,
      documentData.fileName,
      documentData.filePath,
      documentData.fileType,
      documentData.fileSize, // Use the actual file size from documentData
      documentData.metadata,
      {
        isEncrypted: false,
        virusScanResult: 'pending',
        checksum: documentData.checksum
      },
      DocumentStatus.UPLOADING,
      new Date(),
      uploadedBy
    )
    this.documents.set(id, document)
    return document
  }

  async findById(id: string): Promise<Document | null> {
    return this.documents.get(id) || null
  }

  async update(id: string, updates: any): Promise<Document> {
    const document = this.documents.get(id)
    if (!document) throw new Error('Document not found')
    
    let updatedDocument = document
    if (updates.metadata) {
      updatedDocument = updatedDocument.updateMetadata(updates.metadata)
    }
    if (updates.status) {
      updatedDocument = updatedDocument.updateStatus(updates.status)
    }
    if (updates.securityInfo) {
      updatedDocument = updatedDocument.updateSecurityInfo(updates.securityInfo)
    }
    
    this.documents.set(id, updatedDocument)
    return updatedDocument
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id)
  }

  async findByPatientId(patientId: PatientId, pagination: any): Promise<any> {
    const docs = Array.from(this.documents.values()).filter(d => d.patientId === patientId)
    return {
      data: docs,
      total: docs.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(docs.length / pagination.limit),
      hasNext: false,
      hasPrevious: false
    }
  }

  async search(criteria: any, pagination: any): Promise<any> {
    let docs = Array.from(this.documents.values())
    
    if (criteria.patientId) {
      docs = docs.filter(d => d.patientId === criteria.patientId)
    }
    if (criteria.documentType) {
      docs = docs.filter(d => d.metadata.documentType === criteria.documentType)
    }
    if (criteria.status) {
      docs = docs.filter(d => d.status === criteria.status)
    }
    
    return {
      data: docs,
      total: docs.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(docs.length / pagination.limit),
      hasNext: false,
      hasPrevious: false
    }
  }

  async findByType(documentType: DocumentType, pagination: any): Promise<any> {
    return this.search({ documentType }, pagination)
  }

  async findByStatus(status: DocumentStatus, pagination: any): Promise<any> {
    return this.search({ status }, pagination)
  }

  async findExpiredDocuments(pagination: any): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 100, totalPages: 0, hasNext: false, hasPrevious: false }
  }

  async validateDocument(file: File, metadata: any): Promise<DocumentValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    if (!metadata.title) errors.push('Title is required')
    
    const maxSizeBytes = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSizeBytes) errors.push('File too large')

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
    const fileSizeValid = file.size <= maxSizeBytes

    if (!fileTypeValid) errors.push(`Unsupported file type: ${file.type}`)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileTypeValid,
      fileSizeValid,
      virusScanPassed: true
    }
  }

  async storeFile(file: File, documentId: string, patientId: PatientId): Promise<{ filePath: string; checksum: string }> {
    return {
      filePath: `${patientId}/${documentId}.pdf`,
      checksum: 'mock-checksum'
    }
  }

  async retrieveFile(filePath: string): Promise<Blob> {
    return new Blob(['mock file content'])
  }

  async encryptFile(filePath: string): Promise<{ encryptionAlgorithm: string; isEncrypted: boolean }> {
    return { encryptionAlgorithm: 'AES-256', isEncrypted: true }
  }

  async performVirusScan(filePath: string): Promise<{ result: 'clean' | 'infected' | 'pending'; scanDate: Date; details?: string }> {
    return { result: 'clean', scanDate: new Date() }
  }

  async count(): Promise<number> {
    return this.documents.size
  }

  async countByPatient(patientId: PatientId): Promise<number> {
    return Array.from(this.documents.values()).filter(d => d.patientId === patientId).length
  }

  async countByStatus(status: DocumentStatus): Promise<number> {
    return Array.from(this.documents.values()).filter(d => d.status === status).length
  }

  async getTotalStorageSize(): Promise<number> {
    return Array.from(this.documents.values()).reduce((total, doc) => total + doc.fileSize, 0)
  }

  async getPatientStorageSize(patientId: PatientId): Promise<number> {
    return Array.from(this.documents.values())
      .filter(d => d.patientId === patientId)
      .reduce((total, doc) => total + doc.fileSize, 0)
  }
}

describe('DocumentManager', () => {
  let documentManager: DocumentManager
  let mockRepository: MockDocumentRepository
  
  const mockPatientId: PatientId = 'patient-123'
  const mockUserId: UserId = 'user-456'

  beforeEach(() => {
    mockRepository = new MockDocumentRepository()
    documentManager = new DocumentManager(mockRepository)
  })

  describe('uploadDocument', () => {
    const createMockFile = (name: string, type: string, size: number): File => {
      const content = 'x'.repeat(size) // Create content of specified size
      const blob = new Blob([content], { type })
      const file = new File([blob], name, { type })
      // Override the size property since File constructor doesn't always respect it
      Object.defineProperty(file, 'size', { value: size, writable: false })
      return file
    }

    const validUploadRequest: UploadDocumentRequest = {
      patientId: mockPatientId,
      file: createMockFile('test.pdf', 'application/pdf', 1024),
      metadata: {
        title: 'Test Document',
        description: 'A test document',
        documentType: DocumentType.MEDICAL_REPORT,
        tags: ['test'],
        isConfidential: true,
        retentionPeriod: 7
      }
    }

    it('should successfully upload a valid document', async () => {
      const document = await documentManager.uploadDocument(validUploadRequest, mockUserId)

      expect(document).toBeDefined()
      expect(document.patientId).toBe(mockPatientId)
      expect(document.fileName).toBe('test.pdf')
      expect(document.fileType).toBe('application/pdf')
      expect(document.fileSize).toBe(1024)
      expect(document.metadata.title).toBe('Test Document')
      expect(document.uploadedBy).toBe(mockUserId)
    })

    it('should reject document with invalid metadata', async () => {
      const invalidRequest = {
        ...validUploadRequest,
        metadata: {
          ...validUploadRequest.metadata,
          title: '' // Invalid empty title
        }
      }

      await expect(documentManager.uploadDocument(invalidRequest, mockUserId))
        .rejects.toThrow('Document validation failed')
    })

    it('should reject oversized file', async () => {
      const largeFileRequest = {
        ...validUploadRequest,
        file: createMockFile('large.pdf', 'application/pdf', 60 * 1024 * 1024) // 60MB
      }

      await expect(documentManager.uploadDocument(largeFileRequest, mockUserId))
        .rejects.toThrow('Document validation failed')
    })
  })

  describe('validateDocument', () => {
    it('should validate a correct document', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const metadata = {
        title: 'Test Document',
        documentType: DocumentType.MEDICAL_REPORT,
        version: 1,
        isConfidential: false
      }

      const result = await documentManager.validateDocument({ file, metadata })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject document with missing title', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const metadata = {
        title: '',
        documentType: DocumentType.MEDICAL_REPORT,
        version: 1,
        isConfidential: false
      }

      const result = await documentManager.validateDocument({ file, metadata })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Title is required')
    })
  })

  describe('getDocument', () => {
    it('should retrieve an existing document', async () => {
      // First upload a document
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      const uploadedDocument = await documentManager.uploadDocument(uploadRequest, mockUserId)
      
      // Then retrieve it
      const retrievedDocument = await documentManager.getDocument(uploadedDocument.id)

      expect(retrievedDocument).toBeDefined()
      expect(retrievedDocument!.id).toBe(uploadedDocument.id)
      expect(retrievedDocument!.metadata.title).toBe('Test Document')
    })

    it('should return null for non-existent document', async () => {
      const document = await documentManager.getDocument('non-existent-id')
      expect(document).toBeNull()
    })
  })

  describe('updateDocument', () => {
    it('should update document metadata', async () => {
      // First upload a document
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        metadata: {
          title: 'Original Title',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      const uploadedDocument = await documentManager.uploadDocument(uploadRequest, mockUserId)
      
      // Update the document
      const updateRequest: UpdateDocumentRequest = {
        documentId: uploadedDocument.id,
        metadata: {
          title: 'Updated Title',
          description: 'Updated description'
        }
      }

      const updatedDocument = await documentManager.updateDocument(updateRequest)

      expect(updatedDocument.metadata.title).toBe('Updated Title')
      expect(updatedDocument.metadata.description).toBe('Updated description')
      expect(updatedDocument.metadata.version).toBe(2) // Version should increment
    })

    it('should update document status', async () => {
      // First upload a document
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      const uploadedDocument = await documentManager.uploadDocument(uploadRequest, mockUserId)
      
      // Update the status
      const updateRequest: UpdateDocumentRequest = {
        documentId: uploadedDocument.id,
        status: DocumentStatus.VALIDATED
      }

      const updatedDocument = await documentManager.updateDocument(updateRequest)

      expect(updatedDocument.status).toBe(DocumentStatus.VALIDATED)
    })
  })

  describe('deleteDocument', () => {
    it('should delete an existing document', async () => {
      // First upload a document
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      const uploadedDocument = await documentManager.uploadDocument(uploadRequest, mockUserId)
      
      // Delete the document
      await documentManager.deleteDocument(uploadedDocument.id, mockUserId)

      // Verify it's deleted
      const retrievedDocument = await documentManager.getDocument(uploadedDocument.id)
      expect(retrievedDocument).toBeNull()
    })

    it('should throw error when deleting non-existent document', async () => {
      await expect(documentManager.deleteDocument('non-existent-id', mockUserId))
        .rejects.toThrow('Document not found')
    })
  })

  describe('searchDocuments', () => {
    beforeEach(async () => {
      // Upload some test documents
      const documents = [
        {
          patientId: mockPatientId,
          file: new File(['content'], 'medical1.pdf', { type: 'application/pdf' }),
          metadata: {
            title: 'Medical Report 1',
            documentType: DocumentType.MEDICAL_REPORT,
            isConfidential: true
          }
        },
        {
          patientId: mockPatientId,
          file: new File(['content'], 'prescription1.pdf', { type: 'application/pdf' }),
          metadata: {
            title: 'Prescription 1',
            documentType: DocumentType.PRESCRIPTION,
            isConfidential: false
          }
        },
        {
          patientId: 'other-patient',
          file: new File(['content'], 'medical2.pdf', { type: 'application/pdf' }),
          metadata: {
            title: 'Medical Report 2',
            documentType: DocumentType.MEDICAL_REPORT,
            isConfidential: true
          }
        }
      ]

      for (const doc of documents) {
        await documentManager.uploadDocument(doc, mockUserId)
      }
    })

    it('should search documents by patient ID', async () => {
      const searchRequest: DocumentSearchRequest = {
        patientId: mockPatientId,
        pagination: { page: 1, limit: 10 }
      }

      const result = await documentManager.searchDocuments(searchRequest)

      expect(result.data).toHaveLength(2)
      expect(result.data.every(doc => doc.patientId === mockPatientId)).toBe(true)
    })

    it('should search documents by type', async () => {
      const searchRequest: DocumentSearchRequest = {
        documentType: DocumentType.MEDICAL_REPORT,
        pagination: { page: 1, limit: 10 }
      }

      const result = await documentManager.searchDocuments(searchRequest)

      expect(result.data).toHaveLength(2)
      expect(result.data.every(doc => doc.metadata.documentType === DocumentType.MEDICAL_REPORT)).toBe(true)
    })

    it('should search documents with multiple criteria', async () => {
      const searchRequest: DocumentSearchRequest = {
        patientId: mockPatientId,
        documentType: DocumentType.MEDICAL_REPORT,
        pagination: { page: 1, limit: 10 }
      }

      const result = await documentManager.searchDocuments(searchRequest)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].patientId).toBe(mockPatientId)
      expect(result.data[0].metadata.documentType).toBe(DocumentType.MEDICAL_REPORT)
    })
  })

  describe('getPatientDocuments', () => {
    it('should retrieve all documents for a patient', async () => {
      // Upload documents for the patient
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      await documentManager.uploadDocument(uploadRequest, mockUserId)
      await documentManager.uploadDocument(uploadRequest, mockUserId)

      const result = await documentManager.getPatientDocuments(
        mockPatientId,
        { page: 1, limit: 10 }
      )

      expect(result.data).toHaveLength(2)
      expect(result.data.every(doc => doc.patientId === mockPatientId)).toBe(true)
    })
  })

  describe('getDocumentStatistics', () => {
    beforeEach(async () => {
      // Upload some test documents
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      await documentManager.uploadDocument(uploadRequest, mockUserId)
      await documentManager.uploadDocument(uploadRequest, mockUserId)
    })

    it('should return document statistics', async () => {
      const stats = await documentManager.getDocumentStatistics()

      expect(stats.totalDocuments).toBe(2)
      expect(stats.totalStorageSize).toBeGreaterThan(0)
      expect(stats.averageFileSize).toBeGreaterThan(0)
      expect(stats.documentsByType).toBeDefined()
      expect(stats.documentsByStatus).toBeDefined()
    })

    it('should return patient-specific statistics', async () => {
      const stats = await documentManager.getDocumentStatistics(mockPatientId)

      expect(stats.totalDocuments).toBe(2)
      expect(stats.documentsByType[DocumentType.MEDICAL_REPORT]).toBe(2)
    })
  })
})