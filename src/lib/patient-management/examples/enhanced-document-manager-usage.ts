// ============================================================================
// ENHANCED DOCUMENT MANAGER USAGE EXAMPLES
// Examples demonstrating enhanced Document Manager with encryption and version control
// ============================================================================

import { DocumentManager, UploadDocumentRequest, DocumentSearchRequest, DocumentVersionRequest } from '../application/services/DocumentManager'
import { DocumentRepositoryFactory } from '../infrastructure/factories/DocumentRepositoryFactory'
import { DocumentType, DocumentStatus } from '../domain/entities/Document'
import { createClient } from '@supabase/supabase-js'

/**
 * Example: Setting up the Enhanced Document Manager
 */
export function setupDocumentManager() {
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const masterKey = process.env.DOCUMENT_ENCRYPTION_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Create document repository with encryption support
  const documentRepository = DocumentRepositoryFactory.createDefault(supabase, masterKey)

  // Create document manager
  const documentManager = new DocumentManager(documentRepository)

  return documentManager
}

/**
 * Example: Upload a secure document with encryption
 */
export async function uploadSecureDocument() {
  const documentManager = setupDocumentManager()

  // Simulate file upload (in real app, this would come from a form)
  const fileContent = new Uint8Array([/* PDF content */])
  const file = new File([fileContent], 'patient-medical-report.pdf', {
    type: 'application/pdf'
  })

  const uploadRequest: UploadDocumentRequest = {
    patientId: 'patient-123',
    file,
    metadata: {
      title: 'Medical Report - January 2024',
      description: 'Comprehensive medical evaluation and treatment recommendations',
      documentType: DocumentType.MEDICAL_REPORT,
      tags: ['medical', 'evaluation', '2024'],
      isConfidential: true, // This will trigger enhanced security measures
      retentionPeriod: 7, // 7 years retention
      legalBasis: 'Medical treatment and patient care'
    }
  }

  try {
    const document = await documentManager.uploadDocument(uploadRequest, 'therapist-456')
    console.log('Secure document uploaded successfully:', document.id)
    console.log('Document status:', document.status)
    console.log('Encryption status:', document.securityInfo.isEncrypted)
    console.log('Current version:', document.metadata.currentVersion)
    
    return document
  } catch (error) {
    console.error('Document upload failed:', error)
    throw error
  }
}

/**
 * Example: Create a new version of an existing document
 */
export async function createDocumentVersion() {
  const documentManager = setupDocumentManager()

  // Simulate updated file
  const updatedFileContent = new Uint8Array([/* Updated PDF content */])
  const updatedFile = new File([updatedFileContent], 'patient-medical-report-updated.pdf', {
    type: 'application/pdf'
  })

  const versionRequest: DocumentVersionRequest = {
    documentId: 'doc-123',
    file: updatedFile,
    changeDescription: 'Added new test results and updated treatment plan'
  }

  try {
    const version = await documentManager.createDocumentVersion(versionRequest, 'therapist-456')
    console.log('New document version created:', version.version)
    console.log('Version description:', version.changeDescription)
    console.log('Created by:', version.createdBy)
    console.log('Created at:', version.createdAt)
    
    return version
  } catch (error) {
    console.error('Version creation failed:', error)
    throw error
  }
}

/**
 * Example: View document version history
 */
export async function viewDocumentHistory() {
  const documentManager = setupDocumentManager()

  try {
    const versions = await documentManager.getDocumentVersions('doc-123')
    
    console.log('Document version history:')
    versions.forEach(version => {
      console.log(`Version ${version.version}:`)
      console.log(`  Created: ${version.createdAt}`)
      console.log(`  Created by: ${version.createdBy}`)
      console.log(`  Description: ${version.changeDescription || 'No description'}`)
      console.log(`  Checksum: ${version.checksum}`)
      console.log('---')
    })
    
    return versions
  } catch (error) {
    console.error('Version history retrieval failed:', error)
    throw error
  }
}

/**
 * Example: Download a specific document version
 */
export async function downloadDocumentVersion() {
  const documentManager = setupDocumentManager()

  try {
    // Download version 2 of the document
    const fileBlob = await documentManager.downloadDocumentVersion('doc-123', 2)
    
    // Create download link (in a real app)
    const url = URL.createObjectURL(fileBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'medical-report-v2.pdf'
    link.click()
    
    // Clean up
    URL.revokeObjectURL(url)
    
    console.log('Document version downloaded successfully')
    return fileBlob
  } catch (error) {
    console.error('Version download failed:', error)
    throw error
  }
}

/**
 * Example: Search for confidential documents with enhanced security
 */
export async function searchConfidentialDocuments() {
  const documentManager = setupDocumentManager()

  const searchRequest: DocumentSearchRequest = {
    patientId: 'patient-123',
    isConfidential: true, // Only confidential documents
    documentType: DocumentType.MEDICAL_REPORT,
    uploadedAfter: new Date('2024-01-01'),
    tags: ['medical'],
    pagination: { page: 1, limit: 10 }
  }

  try {
    const result = await documentManager.searchDocuments(searchRequest)
    
    console.log(`Found ${result.total} confidential documents`)
    result.data.forEach(doc => {
      console.log(`Document: ${doc.metadata.title}`)
      console.log(`  Type: ${doc.metadata.documentType}`)
      console.log(`  Confidential: ${doc.metadata.isConfidential}`)
      console.log(`  Encrypted: ${doc.securityInfo.isEncrypted}`)
      console.log(`  Current Version: ${doc.metadata.currentVersion}`)
      console.log(`  Uploaded: ${doc.uploadedAt}`)
      console.log('---')
    })
    
    return result
  } catch (error) {
    console.error('Confidential document search failed:', error)
    throw error
  }
}

/**
 * Example: Demonstrate complete document lifecycle with security
 */
export async function demonstrateDocumentLifecycle() {
  console.log('=== Document Lifecycle Demonstration ===')
  
  try {
    // 1. Upload initial document
    console.log('\n1. Uploading initial document...')
    const document = await uploadSecureDocument()
    
    // 2. Create a new version
    console.log('\n2. Creating new version...')
    const version = await createDocumentVersion()
    
    // 3. View version history
    console.log('\n3. Viewing version history...')
    const versions = await viewDocumentHistory()
    
    // 4. Search for documents
    console.log('\n4. Searching confidential documents...')
    const searchResults = await searchConfidentialDocuments()
    
    console.log('\n=== Document lifecycle completed successfully ===')
    
    return {
      document,
      version,
      versions,
      searchResults
    }
  } catch (error) {
    console.error('Document lifecycle demonstration failed:', error)
    throw error
  }
}