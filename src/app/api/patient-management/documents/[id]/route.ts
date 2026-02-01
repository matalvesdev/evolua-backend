// ============================================================================
// PATIENT MANAGEMENT API - INDIVIDUAL DOCUMENT ENDPOINTS
// REST API endpoints for individual document operations
// Requirements: 2.2
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentManager } from '@/lib/patient-management/application/services/DocumentManager'
import { SupabaseDocumentRepository } from '@/lib/patient-management/infrastructure/repositories/SupabaseDocumentRepository'
import { DocumentId, DocumentStatus } from '@/lib/patient-management/domain/entities/Document'
import { UserId } from '@/lib/patient-management/domain/value-objects/UserId'

/**
 * GET /api/patient-management/documents/[id]
 * Get a specific document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Initialize repository and service
    const repository = new SupabaseDocumentRepository(supabase)
    const documentManager = new DocumentManager(repository)

    // Get document
    const document = await documentManager.getDocument(id as DocumentId)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Map to API response format
    const response = {
      id: document.id,
      patientId: document.patientId.value,
      fileName: document.fileName,
      filePath: document.filePath,
      fileType: document.fileType,
      fileSize: document.fileSize,
      metadata: {
        title: document.metadata.title,
        description: document.metadata.description,
        documentType: document.metadata.documentType,
        tags: document.metadata.tags,
        isConfidential: document.metadata.isConfidential,
        version: document.metadata.version,
        retentionPeriod: document.metadata.retentionPeriod,
        legalBasis: document.metadata.legalBasis
      },
      status: document.status,
      securityInfo: {
        isEncrypted: document.securityInfo.isEncrypted,
        encryptionAlgorithm: document.securityInfo.encryptionAlgorithm,
        checksum: document.securityInfo.checksum,
        virusScanResult: document.securityInfo.virusScanResult,
        virusScanDate: document.securityInfo.virusScanDate?.toISOString()
      },
      uploadedAt: document.uploadedAt.toISOString(),
      uploadedBy: document.uploadedBy.value,
      expiresAt: document.expiresAt?.toISOString(),
      canBeAccessed: document.canBeAccessed(),
      shouldBeArchived: document.shouldBeArchived()
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error getting document:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get document',
        code: 'RETRIEVAL_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/patient-management/documents/[id]
 * Update document metadata or status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Initialize repository and service
    const repository = new SupabaseDocumentRepository(supabase)
    const documentManager = new DocumentManager(repository)

    // Build update request
    const updateRequest: any = {
      documentId: id as DocumentId
    }

    if (body.metadata) {
      updateRequest.metadata = body.metadata
    }

    if (body.status) {
      updateRequest.status = body.status as DocumentStatus
    }

    // Update document
    const document = await documentManager.updateDocument(updateRequest)

    // Map to API response format
    const response = {
      id: document.id,
      patientId: document.patientId.value,
      fileName: document.fileName,
      filePath: document.filePath,
      fileType: document.fileType,
      fileSize: document.fileSize,
      metadata: {
        title: document.metadata.title,
        description: document.metadata.description,
        documentType: document.metadata.documentType,
        tags: document.metadata.tags,
        isConfidential: document.metadata.isConfidential,
        version: document.metadata.version,
        retentionPeriod: document.metadata.retentionPeriod,
        legalBasis: document.metadata.legalBasis
      },
      status: document.status,
      securityInfo: {
        isEncrypted: document.securityInfo.isEncrypted,
        encryptionAlgorithm: document.securityInfo.encryptionAlgorithm,
        checksum: document.securityInfo.checksum,
        virusScanResult: document.securityInfo.virusScanResult,
        virusScanDate: document.securityInfo.virusScanDate?.toISOString()
      },
      uploadedAt: document.uploadedAt.toISOString(),
      uploadedBy: document.uploadedBy.value,
      expiresAt: document.expiresAt?.toISOString()
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error updating document:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update document',
        code: 'UPDATE_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/patient-management/documents/[id]
 * Delete a specific document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Initialize repository and service
    const repository = new SupabaseDocumentRepository(supabase)
    const documentManager = new DocumentManager(repository)

    // Delete document
    const userId = new UserId(user.id)
    await documentManager.deleteDocument(id as DocumentId, userId)

    return NextResponse.json(
      { success: true, message: 'Document deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API] Error deleting document:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete document',
        code: 'DELETION_FAILED'
      },
      { status: 500 }
    )
  }
}
