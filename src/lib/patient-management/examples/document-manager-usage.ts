// ============================================================================
// DOCUMENT MANAGER USAGE EXAMPLES
// Examples demonstrating how to use the Document Manager service
// ============================================================================

import { DocumentManager, UploadDocumentRequest, DocumentSearchRequest } from '../application/services/DocumentManager'
import { DocumentRepositoryFactory } from '../infrastructure/factories/DocumentRepositoryFactory'
import { DocumentType, DocumentStatus } from '../domain/entities/Document'
import { createClient } from '@supabase/supabase-js'

/**
 * Example: Setting up the Document Manager
 */
export function setupDocumentManager() {
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Create document repository
  const documentRepository = DocumentRepositoryFactory.createDefault(supabase)

  // Create document manager
  const documentManager = new DocumentManager(documentRepository)

  return documentManager
}

/**
 * Example: Uploading a patient document
 */
export async function uploadPatientDocument() {
  const documentManager = setupDocumentManager()

  // Simulate file upload (in real app, this would come from a form)
  const file = new File(['Medical report content'], 'medical-report.pdf', {
    type: 'application/pdf'
  })

  const uploadRequest: UploadDocumentRequest = {
    patientId: 'patient-123',
    file: file,
    metadata: {
      title: 'Annual Medical Report 2024',
      description: 'Comprehensive medical evaluation and treatment recommendations',
      documentType: DocumentType.MEDICAL_REPORT,
      tags: ['annual', 'evaluation', '2024'],
      isConfidential: true,
      retentionPeriod: 7, // 7 years
      legalBasis: 'Medical treatment and patient care'
    }
  }

  try {
    const document = await documentManager.uploadDocument(uploadRequest, 'therapist-456')
    console.log('Document uploaded successfully:', document.id)
    console.log('Document status:', document.status)
    console.log('Security info:', document.securityInfo)
    return document
  } catch (error) {
    console.error('Failed to upload document:', error)
    throw error
  }
}

/**
 * Example: Validating a document before upload
 */
export async function validateDocumentBeforeUpload() {
  const documentManager = setupDocumentManager()

  const file = new File(['Test content'], 'test.pdf', { type: 'application/pdf' })
  const metadata = {
    title: 'Test Document',
    documentType: DocumentType.MEDICAL_REPORT,
    version: 1,
    isConfidential: false
  }

  try {
    const validationResult = await documentManager.validateDocument({ file, metadata })
    
    if (validationResult.isValid) {
      console.log('Document is valid and ready for upload')
    } else {
      console.log('Document validation failed:')
      validationResult.errors.forEach(error => console.log('- Error:', error))
      validationResult.warnings.forEach(warning => console.log('- Warning:', warning))
    }

    return validationResult
  } catch (error) {
    console.error('Validation failed:', error)
    throw error
  }
}

/**
 * Example: Searching for patient documents
 */
export async function searchPatientDocuments() {
  const documentManager = setupDocumentManager()

  const searchRequest: DocumentSearchRequest = {
    patientId: 'patient-123',
    documentType: DocumentType.MEDICAL_REPORT,
    isConfidential: true,
    uploadedAfter: new Date('2024-01-01'),
    tags: ['annual'],
    pagination: {
      page: 1,
      limit: 10,
      sortBy: 'uploadedAt',
      sortOrder: 'desc'
    }
  }

  try {
    const results = await documentManager.searchDocuments(searchRequest)
    
    console.log(`Found ${results.total} documents`)
    console.log(`Page ${results.page} of ${results.totalPages}`)
    
    results.data.forEach(document => {
      console.log(`- ${document.metadata.title} (${document.fileName})`)
      console.log(`  Uploaded: ${document.uploadedAt.toLocaleDateString()}`)
      console.log(`  Status: ${document.status}`)
      console.log(`  Size: ${(document.fileSize / 1024).toFixed(1)} KB`)
    })

    return results
  } catch (error) {
    console.error('Search failed:', error)
    throw error
  }
}

/**
 * Example: Updating document metadata
 */
export async function updateDocumentMetadata() {
  const documentManager = setupDocumentManager()

  try {
    const updatedDocument = await documentManager.updateDocument({
      documentId: 'doc-123',
      metadata: {
        title: 'Updated Medical Report Title',
        description: 'Updated description with additional notes',
        tags: ['annual', 'evaluation', '2024', 'updated']
      }
    })

    console.log('Document updated successfully')
    console.log('New title:', updatedDocument.metadata.title)
    console.log('Version:', updatedDocument.metadata.version)
    console.log('Updated at:', updatedDocument.updatedAt)

    return updatedDocument
  } catch (error) {
    console.error('Update failed:', error)
    throw error
  }
}

/**
 * Example: Downloading a document
 */
export async function downloadDocument() {
  const documentManager = setupDocumentManager()

  try {
    const blob = await documentManager.downloadDocument({
      documentId: 'doc-123',
      userId: 'therapist-456'
    })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'medical-report.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('Document downloaded successfully')
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

/**
 * Example: Getting document statistics
 */
export async function getDocumentStatistics() {
  const documentManager = setupDocumentManager()

  try {
    // Get overall statistics
    const overallStats = await documentManager.getDocumentStatistics()
    console.log('Overall Statistics:')
    console.log(`- Total documents: ${overallStats.totalDocuments}`)
    console.log(`- Total storage: ${(overallStats.totalStorageSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`- Average file size: ${(overallStats.averageFileSize / 1024).toFixed(1)} KB`)
    console.log(`- Documents this month: ${overallStats.documentsUploadedThisMonth}`)
    console.log(`- Expired documents: ${overallStats.expiredDocuments}`)

    // Get patient-specific statistics
    const patientStats = await documentManager.getDocumentStatistics('patient-123')
    console.log('\nPatient Statistics:')
    console.log(`- Patient documents: ${patientStats.totalDocuments}`)
    console.log(`- Patient storage: ${(patientStats.totalStorageSize / 1024 / 1024).toFixed(2)} MB`)

    // Show documents by type
    console.log('\nDocuments by type:')
    Object.entries(overallStats.documentsByType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`- ${type}: ${count}`)
      }
    })

    // Show documents by status
    console.log('\nDocuments by status:')
    Object.entries(overallStats.documentsByStatus).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`- ${status}: ${count}`)
      }
    })

    return { overallStats, patientStats }
  } catch (error) {
    console.error('Failed to get statistics:', error)
    throw error
  }
}

/**
 * Example: Bulk operations on documents
 */
export async function performBulkOperations() {
  const documentManager = setupDocumentManager()

  const documentIds = ['doc-123', 'doc-456', 'doc-789']

  try {
    // Archive multiple documents
    const archiveResults = await documentManager.performBulkOperation({
      documentIds,
      operation: 'archive',
      userId: 'therapist-456'
    })

    console.log('Bulk archive operation completed:')
    console.log(`- Successful: ${archiveResults.successful.length}`)
    console.log(`- Failed: ${archiveResults.failed.length}`)

    if (archiveResults.failed.length > 0) {
      console.log('Failed operations:')
      archiveResults.failed.forEach(failure => {
        console.log(`- ${failure.documentId}: ${failure.error}`)
      })
    }

    return archiveResults
  } catch (error) {
    console.error('Bulk operation failed:', error)
    throw error
  }
}

/**
 * Example: Archive expired documents
 */
export async function archiveExpiredDocuments() {
  const documentManager = setupDocumentManager()

  try {
    const archivedCount = await documentManager.archiveExpiredDocuments('admin-123')
    console.log(`Archived ${archivedCount} expired documents`)
    return archivedCount
  } catch (error) {
    console.error('Failed to archive expired documents:', error)
    throw error
  }
}

/**
 * Example: Complete document management workflow
 */
export async function completeDocumentWorkflow() {
  console.log('Starting complete document management workflow...')

  try {
    // 1. Upload a document
    console.log('\n1. Uploading document...')
    const document = await uploadPatientDocument()

    // 2. Search for documents
    console.log('\n2. Searching documents...')
    await searchPatientDocuments()

    // 3. Update document metadata
    console.log('\n3. Updating document metadata...')
    await updateDocumentMetadata()

    // 4. Get statistics
    console.log('\n4. Getting statistics...')
    await getDocumentStatistics()

    // 5. Archive expired documents
    console.log('\n5. Archiving expired documents...')
    await archiveExpiredDocuments()

    console.log('\nWorkflow completed successfully!')
  } catch (error) {
    console.error('Workflow failed:', error)
    throw error
  }
}

/**
 * Example: Error handling patterns
 */
export async function demonstrateErrorHandling() {
  const documentManager = setupDocumentManager()

  // Example 1: Handle validation errors
  try {
    const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-executable' })
    await documentManager.uploadDocument({
      patientId: 'patient-123',
      file: invalidFile,
      metadata: {
        title: 'Invalid Document',
        documentType: DocumentType.OTHER,
        isConfidential: false
      }
    }, 'user-123')
  } catch (error) {
    console.log('Caught validation error:', error.message)
  }

  // Example 2: Handle not found errors
  try {
    await documentManager.getDocument('non-existent-id')
  } catch (error) {
    console.log('Caught not found error:', error.message)
  }

  // Example 3: Handle permission errors (would be implemented with proper auth)
  try {
    await documentManager.deleteDocument('doc-123', 'unauthorized-user')
  } catch (error) {
    console.log('Caught permission error:', error.message)
  }
}