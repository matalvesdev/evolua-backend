// ============================================================================
// DOCUMENT STORAGE INTEGRATION TESTS
// Integration tests for enhanced Supabase Storage with encryption and version control
// ============================================================================

import { DocumentManager, UploadDocumentRequest } from '../../application/services/DocumentManager'
import { SupabaseDocumentRepository } from '../../infrastructure/repositories/SupabaseDocumentRepository'
import { DocumentType, DocumentStatus } from '../../domain/entities/Document'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for testing
const mockSupabase = {
  from: jest.fn(),
  storage: {
    from: jest.fn()
  },
  auth: {
    getUser: jest.fn()
  }
}

// Mock crypto for Node.js environment
jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-123',
  randomBytes: (size: number) => Buffer.alloc(size, 'test'),
  createHash: () => ({
    update: () => ({
      digest: () => 'test-checksum'
    })
  }),
  createCipherGCM: () => ({
    update: () => Buffer.from('encrypted'),
    final: () => Buffer.from(''),
    getAuthTag: () => Buffer.from('auth-tag')
  }),
  createDecipherGCM: () => ({
    setAuthTag: () => {},
    update: () => Buffer.from('decrypted'),
    final: () => Buffer.from('')
  }),
  pbkdf2Sync: () => Buffer.from('derived-key')
}))

describe('Document Storage Integration', () => {
  let documentManager: DocumentManager
  let repository: SupabaseDocumentRepository
  const mockPatientId = 'patient-123'
  const mockUserId = 'user-456'

  // Create a more sophisticated mock for different table operations
  const createTableMock = (tableName: string) => {
    switch (tableName) {
      case 'patient_documents':
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'doc-123',
                    patient_id: mockPatientId,
                    file_name: 'test.pdf',
                    file_path: 'patient-123/doc-123/v1_123456.pdf',
                    file_type: 'application/pdf',
                    file_size: 1024,
                    metadata: {
                      title: 'Test Document',
                      documentType: DocumentType.MEDICAL_REPORT,
                      isConfidential: false,
                      versions: [],
                      currentVersion: 1
                    },
                    security_info: {
                      isEncrypted: false,
                      virusScanResult: 'pending',
                      checksum: 'test-checksum'
                    },
                    status: DocumentStatus.UPLOADING,
                    uploaded_at: new Date().toISOString(),
                    uploaded_by: mockUserId,
                    updated_at: new Date().toISOString()
                  }
                })
              })
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'doc-123',
                    patient_id: mockPatientId,
                    file_name: 'test.pdf',
                    file_path: 'patient-123/doc-123/v1_123456.pdf',
                    file_type: 'application/pdf',
                    file_size: 1024,
                    metadata: {
                      title: 'Test Document',
                      documentType: DocumentType.MEDICAL_REPORT,
                      isConfidential: false,
                      version: 1,
                      versions: [],
                      currentVersion: 1
                    },
                    security_info: {
                      isEncrypted: false,
                      virusScanResult: 'pending',
                      checksum: 'test-checksum'
                    },
                    status: DocumentStatus.UPLOADING,
                    uploaded_at: new Date().toISOString(),
                    uploaded_by: mockUserId,
                    updated_at: new Date().toISOString()
                  }
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'doc-123',
                      patient_id: mockPatientId,
                      file_name: 'test.pdf',
                      file_path: 'patient-123/doc-123/v1_123456.pdf',
                      file_type: 'application/pdf',
                      file_size: 1024,
                      metadata: {
                        title: 'Test Document',
                        documentType: DocumentType.MEDICAL_REPORT,
                        isConfidential: false,
                        version: 1
                      },
                      security_info: {
                        isEncrypted: true,
                        encryptionAlgorithm: 'aes-256-gcm',
                        virusScanResult: 'clean',
                        checksum: 'test-checksum'
                      },
                      status: DocumentStatus.VALIDATED,
                      uploaded_at: new Date().toISOString(),
                      uploaded_by: mockUserId,
                      updated_at: new Date().toISOString()
                    }
                  })
                })
              })
            })
          }
        case 'patients':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { clinic_id: 'clinic-123' }
                })
              })
            })
          }
        case 'users':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { clinic_id: 'clinic-123', role: 'therapist' }
                })
              })
            })
          }
        case 'document_encryption_metadata':
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    encryption_key: 'test-key',
                    iv: 'test-iv',
                    auth_tag: 'test-tag',
                    algorithm: 'aes-256-gcm'
                  }
                })
              })
            })
          }
        case 'audit_log':
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null })
          }
        default:
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null })
              })
            })
          }
      }
    }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase.from.mockImplementation(createTableMock)

    // Mock storage operations
    mockSupabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      download: jest.fn().mockResolvedValue({ 
        data: new Blob(['encrypted content']),
        error: null 
      })
    })

    // Mock auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } }
    })

    repository = new SupabaseDocumentRepository(
      'http://localhost:54321',
      'test-key',
      'test-master-key'
    )
    
    // Replace the supabase client with our mock
    ;(repository as any).supabase = mockSupabase

    documentManager = new DocumentManager(repository)
  })

  describe('Secure File Storage', () => {
    it('should encrypt files before storing in Supabase Storage', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file,
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      await documentManager.uploadDocument(uploadRequest, mockUserId)

      // Verify that storage upload was called with encrypted content
      const storageUpload = mockSupabase.storage.from().upload
      expect(storageUpload).toHaveBeenCalledWith(
        expect.stringContaining('patient-123/'),
        expect.any(Blob),
        expect.objectContaining({
          contentType: 'application/octet-stream' // Encrypted files are binary
        })
      )
    })

    it('should store encryption metadata separately', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file,
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      await documentManager.uploadDocument(uploadRequest, mockUserId)

      // Verify encryption metadata was stored
      expect(mockSupabase.from).toHaveBeenCalledWith('document_encryption_metadata')
    })

    it('should decrypt files when retrieving from storage', async () => {
      const documentId = 'doc-123'
      
      // Mock encryption metadata retrieval
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'document_encryption_metadata') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    encryption_key: 'test-key',
                    iv: 'test-iv',
                    auth_tag: 'test-tag',
                    algorithm: 'aes-256-gcm'
                  }
                })
              })
            })
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: documentId,
                  patient_id: mockPatientId,
                  file_path: 'test/path'
                }
              })
            })
          })
        }
      })

      const result = await repository.retrieveFile('test/path')

      expect(result).toBeInstanceOf(Blob)
      expect(mockSupabase.storage.from().download).toHaveBeenCalledWith('test/path')
    })
  })

  describe('Version Control', () => {
    it('should create new document versions', async () => {
      const documentId = 'doc-123'
      const newFile = new File(['updated content'], 'test-v2.pdf', { type: 'application/pdf' })

      // Mock document retrieval for version creation
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'patient_documents') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: documentId,
                    patient_id: mockPatientId,
                    metadata: {
                      currentVersion: 1,
                      versions: [{
                        version: 1,
                        filePath: 'old/path',
                        checksum: 'old-checksum',
                        createdAt: new Date(),
                        createdBy: mockUserId
                      }],
                      documentType: DocumentType.MEDICAL_REPORT,
                      isConfidential: false
                    }
                  }
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: documentId }
                  })
                })
              })
            })
          }
        }
        return mockSupabase.from(table)
      })

      const versionResult = await repository.createDocumentVersion(
        documentId,
        newFile,
        mockUserId,
        'Updated document content'
      )

      expect(versionResult.version).toBe(2)
      expect(versionResult.changeDescription).toBe('Updated document content')
      expect(versionResult.createdBy).toBe(mockUserId)
    })

    it('should retrieve document version history', async () => {
      const documentId = 'doc-123'

      // Mock document with version history
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: documentId,
                patient_id: mockPatientId,
                metadata: {
                  versions: [
                    {
                      version: 1,
                      filePath: 'v1/path',
                      checksum: 'v1-checksum',
                      createdAt: new Date('2024-01-01'),
                      createdBy: mockUserId,
                      changeDescription: 'Initial upload'
                    },
                    {
                      version: 2,
                      filePath: 'v2/path',
                      checksum: 'v2-checksum',
                      createdAt: new Date('2024-01-02'),
                      createdBy: mockUserId,
                      changeDescription: 'Updated content'
                    }
                  ]
                }
              }
            })
          })
        })
      })

      const versions = await repository.getDocumentVersions(documentId)

      expect(versions).toHaveLength(2)
      expect(versions[0].version).toBe(1)
      expect(versions[1].version).toBe(2)
      expect(versions[1].changeDescription).toBe('Updated content')
    })

    it('should retrieve specific document versions', async () => {
      const documentId = 'doc-123'
      const version = 1

      // Mock document with version data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: documentId,
                patient_id: mockPatientId,
                metadata: {
                  versions: [{
                    version: 1,
                    filePath: 'v1/path',
                    checksum: 'v1-checksum',
                    createdAt: new Date(),
                    createdBy: mockUserId
                  }]
                }
              }
            })
          })
        })
      })

      const result = await repository.retrieveDocumentVersion(documentId, version)

      expect(result).toBeInstanceOf(Blob)
      expect(mockSupabase.storage.from().download).toHaveBeenCalledWith('v1/path')
    })
  })

  describe('Access Control', () => {
    it('should verify user access before document operations', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file,
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      // Mock access verification queries
      const originalMock = createTableMock
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'patients') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { clinic_id: 'clinic-123' }
                })
              })
            })
          }
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { clinic_id: 'clinic-123', role: 'therapist' }
                })
              })
            })
          }
        }
        return originalMock(table)
      })

      await expect(documentManager.uploadDocument(uploadRequest, mockUserId))
        .resolves.toBeDefined()

      // Verify access checks were performed
      expect(mockSupabase.from).toHaveBeenCalledWith('patients')
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should deny access for users from different clinics', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file,
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      // Mock access verification with different clinic IDs
      const originalMock = createTableMock
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'patients') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { clinic_id: 'clinic-123' }
                })
              })
            })
          }
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { clinic_id: 'clinic-456', role: 'therapist' } // Different clinic
                })
              })
            })
          }
        }
        return originalMock(table)
      })

      await expect(documentManager.uploadDocument(uploadRequest, mockUserId))
        .rejects.toThrow('Access denied: User does not have access to this patient')
    })

    it('should log all document access attempts', async () => {
      const documentId = 'doc-123'

      // Mock audit log insertion
      const auditLogInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const originalMock = createTableMock
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'audit_log') {
          return { insert: auditLogInsert }
        }
        return originalMock(table)
      })

      await repository.findById(documentId)

      // Verify audit log was created
      expect(auditLogInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          patient_id: mockPatientId,
          operation: 'document_read',
          table_name: 'patient_documents',
          record_id: documentId
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle encryption failures gracefully', async () => {
      // Mock crypto failure by temporarily replacing the module
      const crypto = require('crypto')
      const originalCreateCipherGCM = crypto.createCipherGCM
      crypto.createCipherGCM = jest.fn().mockImplementation(() => {
        throw new Error('Encryption failed')
      })

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file,
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      await expect(documentManager.uploadDocument(uploadRequest, mockUserId))
        .rejects.toThrow('Document upload failed')

      // Restore original function
      crypto.createCipherGCM = originalCreateCipherGCM
    })

    it('should handle storage upload failures', async () => {
      // Mock storage failure
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ 
          error: { message: 'Storage upload failed' }
        })
      })

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file,
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      await expect(documentManager.uploadDocument(uploadRequest, mockUserId))
        .rejects.toThrow('Document upload failed')
    })

    it('should handle database operation failures', async () => {
      // Mock database failure
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              error: { message: 'Database error' }
            })
          })
        })
      })

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const uploadRequest: UploadDocumentRequest = {
        patientId: mockPatientId,
        file,
        metadata: {
          title: 'Test Document',
          documentType: DocumentType.MEDICAL_REPORT,
          isConfidential: false
        }
      }

      await expect(documentManager.uploadDocument(uploadRequest, mockUserId))
        .rejects.toThrow('Document upload failed')
    })
  })
})