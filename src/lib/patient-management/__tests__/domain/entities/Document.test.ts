// ============================================================================
// DOCUMENT ENTITY UNIT TESTS
// Unit tests for the Document domain entity
// ============================================================================

import { Document, DocumentType, DocumentStatus, DocumentMetadata, DocumentSecurityInfo } from '../../../domain/entities/Document'
import { PatientId } from '../../../domain/value-objects/PatientId'
import { UserId } from '../../../domain/value-objects/UserId'

describe('Document Entity', () => {
  const mockPatientId: PatientId = 'patient-123'
  const mockUserId: UserId = 'user-456'
  const mockDocumentId = 'doc-789'

  const validMetadata: DocumentMetadata = {
    title: 'Test Document',
    description: 'A test document',
    documentType: DocumentType.MEDICAL_REPORT,
    tags: ['test', 'medical'],
    version: 1,
    isConfidential: true,
    retentionPeriod: 7,
    legalBasis: 'Medical treatment'
  }

  const validSecurityInfo: DocumentSecurityInfo = {
    isEncrypted: false,
    virusScanResult: 'pending',
    checksum: 'abc123'
  }

  describe('Constructor and Validation', () => {
    it('should create a valid document with all required fields', () => {
      const document = new Document(
        mockDocumentId,
        mockPatientId,
        'test-file.pdf',
        '/path/to/file.pdf',
        'application/pdf',
        1024,
        validMetadata,
        validSecurityInfo,
        DocumentStatus.UPLOADING,
        new Date(),
        mockUserId
      )

      expect(document.id).toBe(mockDocumentId)
      expect(document.patientId).toBe(mockPatientId)
      expect(document.fileName).toBe('test-file.pdf')
      expect(document.fileType).toBe('application/pdf')
      expect(document.fileSize).toBe(1024)
      expect(document.status).toBe(DocumentStatus.UPLOADING)
    })

    it('should throw error for empty file name', () => {
      expect(() => {
        new Document(
          mockDocumentId,
          mockPatientId,
          '',
          '/path/to/file.pdf',
          'application/pdf',
          1024,
          validMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
      }).toThrow('Document file name cannot be empty')
    })

    it('should throw error for empty file path', () => {
      expect(() => {
        new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '',
          'application/pdf',
          1024,
          validMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
      }).toThrow('Document file path cannot be empty')
    })

    it('should throw error for zero file size', () => {
      expect(() => {
        new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          0,
          validMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
      }).toThrow('Document file size must be greater than 0')
    })

    it('should throw error for empty document title', () => {
      const invalidMetadata = { ...validMetadata, title: '' }
      
      expect(() => {
        new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          1024,
          invalidMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
      }).toThrow('Document title cannot be empty')
    })

    it('should throw error for unsupported file type', () => {
      expect(() => {
        new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.exe',
          '/path/to/file.exe',
          'application/x-executable',
          1024,
          validMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
      }).toThrow('Unsupported file type: application/x-executable')
    })

    it('should throw error for file size exceeding limit', () => {
      const largeFileSize = 51 * 1024 * 1024 // 51MB
      
      expect(() => {
        new Document(
          mockDocumentId,
          mockPatientId,
          'large-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          largeFileSize,
          validMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
      }).toThrow('File size exceeds maximum allowed size')
    })

    it('should accept all supported file types', () => {
      const supportedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain'
      ]

      supportedTypes.forEach(fileType => {
        expect(() => {
          new Document(
            mockDocumentId,
            mockPatientId,
            'test-file',
            '/path/to/file',
            fileType,
            1024,
            validMetadata,
            validSecurityInfo,
            DocumentStatus.UPLOADING,
            new Date(),
            mockUserId
          )
        }).not.toThrow()
      })
    })
  })

  describe('Domain Methods', () => {
    let document: Document

    beforeEach(() => {
      document = new Document(
        mockDocumentId,
        mockPatientId,
        'test-file.pdf',
        '/path/to/file.pdf',
        'application/pdf',
        1024,
        validMetadata,
        validSecurityInfo,
        DocumentStatus.UPLOADING,
        new Date(),
        mockUserId
      )
    })

    describe('updateMetadata', () => {
      it('should update metadata and increment version', () => {
        const newMetadata = { title: 'Updated Title' }
        const updatedDocument = document.updateMetadata(newMetadata)

        expect(updatedDocument.metadata.title).toBe('Updated Title')
        expect(updatedDocument.metadata.version).toBe(2)
        expect(updatedDocument.metadata.documentType).toBe(validMetadata.documentType) // Should preserve other fields
        expect(updatedDocument.updatedAt).not.toBe(document.updatedAt)
      })

      it('should preserve original document immutability', () => {
        const newMetadata = { title: 'Updated Title' }
        const updatedDocument = document.updateMetadata(newMetadata)

        expect(document.metadata.title).toBe('Test Document')
        expect(document.metadata.version).toBe(1)
        expect(updatedDocument).not.toBe(document)
      })
    })

    describe('updateStatus', () => {
      it('should update document status', () => {
        const updatedDocument = document.updateStatus(DocumentStatus.VALIDATED)

        expect(updatedDocument.status).toBe(DocumentStatus.VALIDATED)
        expect(updatedDocument.updatedAt).not.toBe(document.updatedAt)
      })

      it('should preserve original document immutability', () => {
        const updatedDocument = document.updateStatus(DocumentStatus.VALIDATED)

        expect(document.status).toBe(DocumentStatus.UPLOADING)
        expect(updatedDocument).not.toBe(document)
      })
    })

    describe('updateSecurityInfo', () => {
      it('should update security information', () => {
        const newSecurityInfo = { 
          isEncrypted: true, 
          encryptionAlgorithm: 'AES-256',
          virusScanResult: 'clean' as const
        }
        const updatedDocument = document.updateSecurityInfo(newSecurityInfo)

        expect(updatedDocument.securityInfo.isEncrypted).toBe(true)
        expect(updatedDocument.securityInfo.encryptionAlgorithm).toBe('AES-256')
        expect(updatedDocument.securityInfo.virusScanResult).toBe('clean')
        expect(updatedDocument.securityInfo.checksum).toBe('abc123') // Should preserve other fields
      })
    })

    describe('isValidated', () => {
      it('should return true for validated documents', () => {
        const validatedDocument = document.updateStatus(DocumentStatus.VALIDATED)
        expect(validatedDocument.isValidated()).toBe(true)
      })

      it('should return false for non-validated documents', () => {
        expect(document.isValidated()).toBe(false)
      })
    })

    describe('isSecure', () => {
      it('should return true for encrypted and clean documents', () => {
        const secureDocument = document.updateSecurityInfo({
          isEncrypted: true,
          virusScanResult: 'clean'
        })
        expect(secureDocument.isSecure()).toBe(true)
      })

      it('should return false for unencrypted documents', () => {
        const unsecureDocument = document.updateSecurityInfo({
          isEncrypted: false,
          virusScanResult: 'clean'
        })
        expect(unsecureDocument.isSecure()).toBe(false)
      })

      it('should return false for infected documents', () => {
        const infectedDocument = document.updateSecurityInfo({
          isEncrypted: true,
          virusScanResult: 'infected'
        })
        expect(infectedDocument.isSecure()).toBe(false)
      })
    })

    describe('canBeAccessed', () => {
      it('should return true for validated and secure documents', () => {
        const accessibleDocument = document
          .updateStatus(DocumentStatus.VALIDATED)
          .updateSecurityInfo({
            isEncrypted: true,
            virusScanResult: 'clean'
          })
        expect(accessibleDocument.canBeAccessed()).toBe(true)
      })

      it('should return false for non-validated documents', () => {
        const secureDocument = document.updateSecurityInfo({
          isEncrypted: true,
          virusScanResult: 'clean'
        })
        expect(secureDocument.canBeAccessed()).toBe(false)
      })

      it('should return false for insecure documents', () => {
        const validatedDocument = document.updateStatus(DocumentStatus.VALIDATED)
        expect(validatedDocument.canBeAccessed()).toBe(false)
      })
    })

    describe('getFileExtension', () => {
      it('should return correct file extension', () => {
        expect(document.getFileExtension()).toBe('pdf')
      })

      it('should return empty string for files without extension', () => {
        const noExtDocument = new Document(
          mockDocumentId,
          mockPatientId,
          'filename',
          '/path/to/file',
          'application/pdf',
          1024,
          validMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
        expect(noExtDocument.getFileExtension()).toBe('')
      })
    })

    describe('isExpired', () => {
      it('should return false for documents without retention period', () => {
        const noRetentionMetadata = { ...validMetadata, retentionPeriod: undefined }
        const noRetentionDocument = new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          1024,
          noRetentionMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          new Date(),
          mockUserId
        )
        expect(noRetentionDocument.isExpired()).toBe(false)
      })

      it('should return true for expired documents', () => {
        const oldDate = new Date()
        oldDate.setFullYear(oldDate.getFullYear() - 8) // 8 years ago
        
        const expiredDocument = new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          1024,
          validMetadata, // Has 7 year retention period
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          oldDate,
          mockUserId
        )
        expect(expiredDocument.isExpired()).toBe(true)
      })

      it('should return false for non-expired documents', () => {
        const recentDate = new Date()
        recentDate.setFullYear(recentDate.getFullYear() - 5) // 5 years ago
        
        const validDocument = new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          1024,
          validMetadata, // Has 7 year retention period
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          recentDate,
          mockUserId
        )
        expect(validDocument.isExpired()).toBe(false)
      })
    })

    describe('shouldBeArchived', () => {
      it('should return true for expired documents', () => {
        const oldDate = new Date()
        oldDate.setFullYear(oldDate.getFullYear() - 8)
        
        const expiredDocument = new Document(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          1024,
          validMetadata,
          validSecurityInfo,
          DocumentStatus.UPLOADING,
          oldDate,
          mockUserId
        )
        expect(expiredDocument.shouldBeArchived()).toBe(true)
      })

      it('should return true for archived documents', () => {
        const archivedDocument = document.updateStatus(DocumentStatus.ARCHIVED)
        expect(archivedDocument.shouldBeArchived()).toBe(true)
      })

      it('should return false for valid, non-archived documents', () => {
        expect(document.shouldBeArchived()).toBe(false)
      })
    })
  })

  describe('Static Factory Methods', () => {
    describe('create', () => {
      it('should create a document with default values', () => {
        const document = Document.create(
          mockDocumentId,
          mockPatientId,
          'test-file.pdf',
          '/path/to/file.pdf',
          'application/pdf',
          1024,
          validMetadata,
          mockUserId,
          'checksum123'
        )

        expect(document.id).toBe(mockDocumentId)
        expect(document.status).toBe(DocumentStatus.UPLOADING)
        expect(document.securityInfo.isEncrypted).toBe(false)
        expect(document.securityInfo.virusScanResult).toBe('pending')
        expect(document.securityInfo.checksum).toBe('checksum123')
      })
    })
  })
})