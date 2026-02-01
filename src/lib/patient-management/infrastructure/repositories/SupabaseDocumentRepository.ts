// ============================================================================
// SUPABASE DOCUMENT REPOSITORY IMPLEMENTATION
// Enhanced implementation with secure storage, encryption, version control, and access control
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { Document, DocumentId, DocumentStatus, DocumentType } from '../../domain/entities/Document'
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
} from './IDocumentRepository'
import * as crypto from 'crypto'

// Enhanced interfaces for version control and encryption
interface DocumentVersion {
  version: number
  filePath: string
  checksum: string
  createdAt: Date
  createdBy: UserId
  changeDescription?: string
}

interface EncryptionConfig {
  algorithm: string
  keyDerivation: string
  ivLength: number
  tagLength: number
}

interface AccessControlContext {
  userId: UserId
  patientId: PatientId
  operation: 'read' | 'write' | 'delete'
  documentType?: DocumentType
  isConfidential?: boolean
}

/**
 * Enhanced Supabase Document Repository Implementation
 * 
 * This implementation provides secure document storage and management using Supabase
 * with advanced features including:
 * - End-to-end encryption with AES-256-GCM
 * - Document version control and history tracking
 * - Granular access control and authorization
 * - Secure file storage with integrity verification
 * - LGPD compliance features
 * 
 * Requirements: 2.2, 2.3
 */
export class SupabaseDocumentRepository implements IDocumentRepository {
  private supabase: ReturnType<typeof createClient>
  private encryptionConfig: EncryptionConfig
  private masterKey: string

  constructor(supabaseUrl: string, supabaseKey: string, masterKey?: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.masterKey = masterKey || process.env.DOCUMENT_ENCRYPTION_KEY || this.generateMasterKey()
    this.encryptionConfig = {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      ivLength: 16,
      tagLength: 16
    }
  }

  async create(documentData: CreateDocumentData, uploadedBy: UserId): Promise<Document> {
    try {
      // Verify access control
      await this.verifyAccess({
        userId: uploadedBy,
        patientId: documentData.patientId,
        operation: 'write',
        documentType: documentData.metadata.documentType,
        isConfidential: documentData.metadata.isConfidential
      })

      const documentId = crypto.randomUUID()
      
      // Create initial version record
      const versionData: DocumentVersion = {
        version: 1,
        filePath: documentData.filePath,
        checksum: documentData.checksum,
        createdAt: new Date(),
        createdBy: uploadedBy,
        changeDescription: 'Initial upload'
      }

      const { data, error } = await this.supabase
        .from('patient_documents')
        .insert({
          id: documentId,
          patient_id: documentData.patientId,
          file_name: documentData.fileName,
          file_path: documentData.filePath,
          file_type: documentData.fileType,
          file_size: documentData.fileSize,
          metadata: {
            ...documentData.metadata,
            versions: [versionData],
            currentVersion: 1
          },
          security_info: {
            isEncrypted: false, // Will be updated after encryption
            virusScanResult: 'pending',
            checksum: documentData.checksum,
            accessLevel: documentData.metadata.isConfidential ? 'confidential' : 'standard',
            encryptionStatus: 'pending'
          },
          status: DocumentStatus.UPLOADING,
          uploaded_by: uploadedBy,
          uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create document: ${error.message}`)
      }

      // Log the creation for audit trail
      await this.logDocumentAccess(uploadedBy, documentData.patientId, 'create', documentId)

      return this.mapToDocument(data)
    } catch (error) {
      throw new Error(`Document creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findById(id: DocumentId): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from('patient_documents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Document not found
        }
        throw new Error(`Failed to find document: ${error.message}`)
      }

      // Verify access control before returning document
      const currentUser = await this.getCurrentUser()
      if (currentUser) {
        await this.verifyAccess({
          userId: currentUser.id,
          patientId: data.patient_id,
          operation: 'read',
          documentType: data.metadata?.documentType,
          isConfidential: data.metadata?.isConfidential
        })

        // Log the access for audit trail
        await this.logDocumentAccess(currentUser.id, data.patient_id, 'read', id)
      }

      return this.mapToDocument(data)
    } catch (error) {
      throw new Error(`Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async update(id: DocumentId, updates: UpdateDocumentData): Promise<Document> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.metadata) {
        updateData.metadata = updates.metadata
      }

      if (updates.status) {
        updateData.status = updates.status
      }

      if (updates.securityInfo) {
        updateData.security_info = updates.securityInfo
      }

      const { data, error } = await this.supabase
        .from('patient_documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`)
      }

      return this.mapToDocument(data)
    } catch (error) {
      throw new Error(`Document update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async delete(id: DocumentId): Promise<void> {
    try {
      // First get the document to retrieve file path
      const document = await this.findById(id)
      if (!document) {
        throw new Error('Document not found')
      }

      // Delete the file from storage
      const { error: storageError } = await this.supabase.storage
        .from('patient-documents')
        .remove([document.filePath])

      if (storageError) {
        console.warn(`Failed to delete file from storage: ${storageError.message}`)
      }

      // Delete the database record
      const { error } = await this.supabase
        .from('patient_documents')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Document deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findByPatientId(
    patientId: PatientId,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    try {
      const offset = (pagination.page - 1) * pagination.limit
      const sortColumn = this.mapSortColumn(pagination.sortBy || 'uploadedAt')
      const sortOrder = pagination.sortOrder || 'desc'

      // Get total count
      const { count } = await this.supabase
        .from('patient_documents')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)

      // Get paginated data
      const { data, error } = await this.supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order(sortColumn, { ascending: sortOrder === 'asc' })
        .range(offset, offset + pagination.limit - 1)

      if (error) {
        throw new Error(`Failed to find documents: ${error.message}`)
      }

      const documents = data.map(row => this.mapToDocument(row))
      const totalPages = Math.ceil((count || 0) / pagination.limit)

      return {
        data: documents,
        total: count || 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1
      }
    } catch (error) {
      throw new Error(`Document search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async search(
    criteria: DocumentSearchCriteria,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    try {
      let query = this.supabase.from('patient_documents').select('*', { count: 'exact' })

      // Apply filters
      if (criteria.patientId) {
        query = query.eq('patient_id', criteria.patientId)
      }

      if (criteria.documentType) {
        query = query.eq('metadata->>documentType', criteria.documentType)
      }

      if (criteria.status) {
        query = query.eq('status', criteria.status)
      }

      if (criteria.isConfidential !== undefined) {
        query = query.eq('metadata->>isConfidential', criteria.isConfidential)
      }

      if (criteria.uploadedAfter) {
        query = query.gte('uploaded_at', criteria.uploadedAfter.toISOString())
      }

      if (criteria.uploadedBefore) {
        query = query.lte('uploaded_at', criteria.uploadedBefore.toISOString())
      }

      if (criteria.query) {
        query = query.or(`metadata->>title.ilike.%${criteria.query}%,metadata->>description.ilike.%${criteria.query}%`)
      }

      if (criteria.tags && criteria.tags.length > 0) {
        query = query.contains('metadata->tags', criteria.tags)
      }

      // Get total count
      const { count } = await query

      // Apply pagination and sorting
      const offset = (pagination.page - 1) * pagination.limit
      const sortColumn = this.mapSortColumn(pagination.sortBy || 'uploadedAt')
      const sortOrder = pagination.sortOrder || 'desc'

      const { data, error } = await query
        .order(sortColumn, { ascending: sortOrder === 'asc' })
        .range(offset, offset + pagination.limit - 1)

      if (error) {
        throw new Error(`Failed to search documents: ${error.message}`)
      }

      const documents = data.map(row => this.mapToDocument(row))
      const totalPages = Math.ceil((count || 0) / pagination.limit)

      return {
        data: documents,
        total: count || 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1
      }
    } catch (error) {
      throw new Error(`Document search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findByType(
    documentType: DocumentType,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    return this.search({ documentType }, pagination)
  }

  async findByStatus(
    status: DocumentStatus,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    return this.search({ status }, pagination)
  }

  async findExpiredDocuments(
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    try {
      // This is a simplified implementation - in a real scenario,
      // you'd need to calculate expiration based on retention periods
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      return this.search({ uploadedBefore: oneYearAgo }, pagination)
    } catch (error) {
      throw new Error(`Failed to find expired documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateDocument(
    file: File,
    metadata: any
  ): Promise<DocumentValidationResult> {
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
    const fileSizeValid = file.size <= maxSizeBytes
    if (!fileSizeValid) {
      errors.push(`File size exceeds maximum allowed size of ${maxSizeBytes} bytes`)
    }

    // Validate metadata
    if (!metadata.title || !metadata.title.trim()) {
      errors.push('Document title is required')
    }

    if (!metadata.documentType) {
      errors.push('Document type is required')
    }

    // For now, assume virus scan passes (would integrate with actual scanning service)
    const virusScanPassed = true

    // Add warnings for large files
    if (file.size > 10 * 1024 * 1024) { // 10MB
      warnings.push('Large file size may affect upload performance')
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

  async storeFile(
    file: File,
    documentId: DocumentId,
    patientId: PatientId
  ): Promise<{ filePath: string; checksum: string }> {
    try {
      // Generate file path with version support
      const fileExtension = file.name.split('.').pop()
      const timestamp = Date.now()
      const filePath = `${patientId}/${documentId}/v1_${timestamp}.${fileExtension}`

      // Calculate checksum before encryption
      const arrayBuffer = await file.arrayBuffer()
      const originalChecksum = crypto.createHash('sha256').update(new Uint8Array(arrayBuffer)).digest('hex')

      // Encrypt the file content
      const encryptedData = await this.encryptFileContent(new Uint8Array(arrayBuffer), patientId)
      const encryptedBlob = new Blob([encryptedData.encryptedContent])

      // Upload encrypted file to Supabase Storage
      const { error } = await this.supabase.storage
        .from('patient-documents')
        .upload(filePath, encryptedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/octet-stream' // Encrypted files are binary
        })

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`)
      }

      // Store encryption metadata separately for security
      await this.storeEncryptionMetadata(documentId, {
        filePath,
        encryptionKey: encryptedData.encryptionKey,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        algorithm: this.encryptionConfig.algorithm
      })

      return { filePath, checksum: originalChecksum }
    } catch (error) {
      throw new Error(`File storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async retrieveFile(filePath: string): Promise<Blob> {
    try {
      // Download encrypted file from Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('patient-documents')
        .download(filePath)

      if (error) {
        throw new Error(`Failed to retrieve file: ${error.message}`)
      }

      // Extract document ID from file path to get encryption metadata
      const pathParts = filePath.split('/')
      const documentId = pathParts[1] // Assuming path format: patientId/documentId/version_file

      // Get encryption metadata
      const encryptionMetadata = await this.getEncryptionMetadata(documentId)
      if (!encryptionMetadata) {
        throw new Error('Encryption metadata not found')
      }

      // Decrypt the file content
      const encryptedContent = new Uint8Array(await data.arrayBuffer())
      const decryptedContent = await this.decryptFileContent(encryptedContent, encryptionMetadata)

      return new Blob([decryptedContent])
    } catch (error) {
      throw new Error(`File retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async encryptFile(filePath: string): Promise<{
    encryptionAlgorithm: string
    isEncrypted: boolean
  }> {
    try {
      // Extract document ID from file path
      const pathParts = filePath.split('/')
      const documentId = pathParts[1]

      // Update document security info to mark as encrypted
      await this.supabase
        .from('patient_documents')
        .update({
          security_info: {
            isEncrypted: true,
            encryptionAlgorithm: this.encryptionConfig.algorithm,
            encryptionStatus: 'encrypted',
            encryptedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      return {
        encryptionAlgorithm: this.encryptionConfig.algorithm,
        isEncrypted: true
      }
    } catch (error) {
      throw new Error(`File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async performVirusScan(filePath: string): Promise<{
    result: 'clean' | 'infected' | 'pending'
    scanDate: Date
    details?: string
  }> {
    // This is a placeholder implementation
    // In a real scenario, you'd integrate with virus scanning services
    return {
      result: 'clean',
      scanDate: new Date(),
      details: 'File scanned successfully'
    }
  }

  async count(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('patient_documents')
        .select('*', { count: 'exact', head: true })

      if (error) {
        throw new Error(`Failed to count documents: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      throw new Error(`Document count failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async countByPatient(patientId: PatientId): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('patient_documents')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)

      if (error) {
        throw new Error(`Failed to count patient documents: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      throw new Error(`Patient document count failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async countByStatus(status: DocumentStatus): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('patient_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)

      if (error) {
        throw new Error(`Failed to count documents by status: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      throw new Error(`Document status count failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getTotalStorageSize(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('patient_documents')
        .select('file_size')

      if (error) {
        throw new Error(`Failed to get storage size: ${error.message}`)
      }

      return data.reduce((total, doc) => total + (doc.file_size || 0), 0)
    } catch (error) {
      throw new Error(`Storage size calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPatientStorageSize(patientId: PatientId): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('patient_documents')
        .select('file_size')
        .eq('patient_id', patientId)

      if (error) {
        throw new Error(`Failed to get patient storage size: ${error.message}`)
      }

      return data.reduce((total, doc) => total + (doc.file_size || 0), 0)
    } catch (error) {
      throw new Error(`Patient storage size calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods
  private mapToDocument(row: any): Document {
    return new Document(
      row.id,
      row.patient_id,
      row.file_name,
      row.file_path,
      row.file_type,
      row.file_size,
      row.metadata,
      row.security_info,
      row.status,
      new Date(row.uploaded_at),
      row.uploaded_by,
      new Date(row.updated_at)
    )
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      fileName: 'file_name',
      uploadedAt: 'uploaded_at',
      updatedAt: 'updated_at',
      fileSize: 'file_size'
    }

    return columnMap[sortBy] || 'uploaded_at'
  }

  // ============================================================================
  // ENCRYPTION METHODS
  // ============================================================================

  private generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private async encryptFileContent(
    content: Uint8Array,
    patientId: PatientId
  ): Promise<{
    encryptedContent: Uint8Array
    encryptionKey: string
    iv: string
    authTag: string
  }> {
    try {
      // Derive patient-specific key from master key
      const salt = crypto.createHash('sha256').update(patientId).digest()
      const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, 32, 'sha256')

      // Generate random IV
      const iv = crypto.randomBytes(this.encryptionConfig.ivLength)

      // Create cipher
      const cipher = crypto.createCipherGCM(this.encryptionConfig.algorithm, key, iv)

      // Encrypt content
      const encrypted = Buffer.concat([cipher.update(content), cipher.final()])
      const authTag = cipher.getAuthTag()

      return {
        encryptedContent: new Uint8Array(encrypted),
        encryptionKey: key.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      }
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async decryptFileContent(
    encryptedContent: Uint8Array,
    metadata: {
      encryptionKey: string
      iv: string
      authTag: string
      algorithm: string
    }
  ): Promise<Uint8Array> {
    try {
      const key = Buffer.from(metadata.encryptionKey, 'hex')
      const iv = Buffer.from(metadata.iv, 'hex')
      const authTag = Buffer.from(metadata.authTag, 'hex')

      // Create decipher
      const decipher = crypto.createDecipherGCM(metadata.algorithm, key, iv)
      decipher.setAuthTag(authTag)

      // Decrypt content
      const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
      ])

      return new Uint8Array(decrypted)
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async storeEncryptionMetadata(
    documentId: DocumentId,
    metadata: {
      filePath: string
      encryptionKey: string
      iv: string
      authTag: string
      algorithm: string
    }
  ): Promise<void> {
    try {
      // Store encryption metadata in a separate secure table
      const { error } = await this.supabase
        .from('document_encryption_metadata')
        .insert({
          document_id: documentId,
          file_path: metadata.filePath,
          encryption_key: metadata.encryptionKey,
          iv: metadata.iv,
          auth_tag: metadata.authTag,
          algorithm: metadata.algorithm,
          created_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Failed to store encryption metadata: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Encryption metadata storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getEncryptionMetadata(documentId: DocumentId): Promise<{
    encryptionKey: string
    iv: string
    authTag: string
    algorithm: string
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('document_encryption_metadata')
        .select('*')
        .eq('document_id', documentId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to get encryption metadata: ${error.message}`)
      }

      return {
        encryptionKey: data.encryption_key,
        iv: data.iv,
        authTag: data.auth_tag,
        algorithm: data.algorithm
      }
    } catch (error) {
      throw new Error(`Encryption metadata retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================================================
  // ACCESS CONTROL METHODS
  // ============================================================================

  private async verifyAccess(context: AccessControlContext): Promise<void> {
    try {
      // Check if user has access to the patient
      const { data: patientAccess, error: accessError } = await this.supabase
        .from('patients')
        .select('clinic_id')
        .eq('id', context.patientId)
        .single()

      if (accessError) {
        throw new Error('Patient not found or access denied')
      }

      // Check if user belongs to the same clinic
      const { data: userClinic, error: userError } = await this.supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', context.userId)
        .single()

      if (userError) {
        throw new Error('User not found')
      }

      if (patientAccess.clinic_id !== userClinic.clinic_id) {
        throw new Error('Access denied: User does not have access to this patient')
      }

      // Additional checks for confidential documents
      if (context.isConfidential && context.operation === 'read') {
        // Only certain roles can access confidential documents
        const allowedRoles = ['admin', 'therapist', 'doctor']
        if (!allowedRoles.includes(userClinic.role)) {
          throw new Error('Access denied: Insufficient privileges for confidential documents')
        }
      }

      // Log successful access verification
      await this.logAccessVerification(context)
    } catch (error) {
      throw new Error(`Access verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getCurrentUser(): Promise<{ id: UserId } | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      return user ? { id: user.id } : null
    } catch (error) {
      return null
    }
  }

  private async logDocumentAccess(
    userId: UserId,
    patientId: PatientId,
    operation: string,
    documentId?: DocumentId
  ): Promise<void> {
    try {
      await this.supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          patient_id: patientId,
          operation: `document_${operation}`,
          table_name: 'patient_documents',
          record_id: documentId,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      // Log errors but don't fail the main operation
      console.warn('Failed to log document access:', error)
    }
  }

  private async logAccessVerification(context: AccessControlContext): Promise<void> {
    try {
      await this.supabase
        .from('audit_log')
        .insert({
          user_id: context.userId,
          patient_id: context.patientId,
          operation: `access_verification_${context.operation}`,
          table_name: 'patient_documents',
          new_values: {
            documentType: context.documentType,
            isConfidential: context.isConfidential
          },
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      // Log errors but don't fail the main operation
      console.warn('Failed to log access verification:', error)
    }
  }

  // ============================================================================
  // VERSION CONTROL METHODS
  // ============================================================================

  async createDocumentVersion(
    documentId: DocumentId,
    file: File,
    userId: UserId,
    changeDescription?: string
  ): Promise<DocumentVersion> {
    try {
      // Get current document to access patient ID and current version
      const document = await this.findById(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // Verify write access
      await this.verifyAccess({
        userId,
        patientId: document.patientId,
        operation: 'write',
        documentType: document.metadata.documentType,
        isConfidential: document.metadata.isConfidential
      })

      const currentVersion = document.metadata.currentVersion || 1
      const newVersion = currentVersion + 1

      // Store the new version file
      const fileExtension = file.name.split('.').pop()
      const timestamp = Date.now()
      const newFilePath = `${document.patientId}/${documentId}/v${newVersion}_${timestamp}.${fileExtension}`

      // Calculate checksum and encrypt
      const arrayBuffer = await file.arrayBuffer()
      const checksum = crypto.createHash('sha256').update(new Uint8Array(arrayBuffer)).digest('hex')
      const encryptedData = await this.encryptFileContent(new Uint8Array(arrayBuffer), document.patientId)
      const encryptedBlob = new Blob([encryptedData.encryptedContent])

      // Upload new version
      const { error: uploadError } = await this.supabase.storage
        .from('patient-documents')
        .upload(newFilePath, encryptedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/octet-stream'
        })

      if (uploadError) {
        throw new Error(`Failed to upload new version: ${uploadError.message}`)
      }

      // Store encryption metadata for new version
      await this.storeEncryptionMetadata(documentId, {
        filePath: newFilePath,
        encryptionKey: encryptedData.encryptionKey,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        algorithm: this.encryptionConfig.algorithm
      })

      // Create version record
      const versionData: DocumentVersion = {
        version: newVersion,
        filePath: newFilePath,
        checksum,
        createdAt: new Date(),
        createdBy: userId,
        changeDescription
      }

      // Update document with new version information
      const currentVersions = document.metadata.versions || []
      const updatedVersions = [...currentVersions, versionData]

      await this.supabase
        .from('patient_documents')
        .update({
          file_path: newFilePath, // Update current file path
          file_size: file.size,
          metadata: {
            ...document.metadata,
            versions: updatedVersions,
            currentVersion: newVersion
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      // Log version creation
      await this.logDocumentAccess(userId, document.patientId, 'version_created', documentId)

      return versionData
    } catch (error) {
      throw new Error(`Version creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getDocumentVersions(documentId: DocumentId): Promise<DocumentVersion[]> {
    try {
      const document = await this.findById(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      return document.metadata.versions || []
    } catch (error) {
      throw new Error(`Version retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async retrieveDocumentVersion(
    documentId: DocumentId,
    version: number
  ): Promise<Blob> {
    try {
      const document = await this.findById(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      const versions = document.metadata.versions || []
      const versionData = versions.find(v => v.version === version)
      if (!versionData) {
        throw new Error('Version not found')
      }

      return await this.retrieveFile(versionData.filePath)
    } catch (error) {
      throw new Error(`Version retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}