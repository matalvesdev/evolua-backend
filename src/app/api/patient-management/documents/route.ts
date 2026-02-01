// ============================================================================
// PATIENT MANAGEMENT API - DOCUMENTS ENDPOINTS
// REST API endpoints for document management operations
// Requirements: 2.2
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentManager } from '@/lib/patient-management/application/services/DocumentManager'
import { SupabaseDocumentRepository } from '@/lib/patient-management/infrastructure/repositories/SupabaseDocumentRepository'
import { PatientId } from '@/lib/patient-management/domain/value-objects/PatientId'
import { UserId } from '@/lib/patient-management/domain/value-objects/UserId'
import { DocumentType, DocumentStatus } from '@/lib/patient-management/domain/entities/Document'

/**
 * GET /api/patient-management/documents?patientId=xxx
 * Search and list documents with filtering and pagination
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const patientIdParam = searchParams.get('patientId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const documentType = searchParams.get('documentType') as DocumentType | null
    const status = searchParams.get('status') as DocumentStatus | null
    const query = searchParams.get('query') || undefined

    // Initialize repository and service
    const repository = new SupabaseDocumentRepository(supabase)
    const documentManager = new DocumentManager(repository)

    // Build search request
    const searchRequest: any = {
      pagination: { page, limit }
    }

    if (patientIdParam) {
      searchRequest.patientId = new PatientId(patientIdParam)
    }

    if (documentType) {
      searchRequest.documentType = documentType
    }

    if (status) {
      searchRequest.status = status
    }

    if (query) {
      searchRequest.query = query
    }

    // Execute search
    const result = await documentManager.searchDocuments(searchRequest)

    // Map to API response format
    const response = {
      data: result.data.map(doc => ({
        id: doc.id,
        patientId: doc.patientId.value,
        fileName: doc.fileName,
        filePath: doc.filePath,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        metadata: {
          title: doc.metadata.title,
          description: doc.metadata.description,
          documentType: doc.metadata.documentType,
          tags: doc.metadata.tags,
          isConfidential: doc.metadata.isConfidential,
          version: doc.metadata.version,
          retentionPeriod: doc.metadata.retentionPeriod,
          legalBasis: doc.metadata.legalBasis
        },
        status: doc.status,
        securityInfo: {
          isEncrypted: doc.securityInfo.isEncrypted,
          encryptionAlgorithm: doc.securityInfo.encryptionAlgorithm,
          checksum: doc.securityInfo.checksum,
          virusScanResult: doc.securityInfo.virusScanResult,
          virusScanDate: doc.securityInfo.virusScanDate?.toISOString()
        },
        uploadedAt: doc.uploadedAt.toISOString(),
        uploadedBy: doc.uploadedBy.value,
        expiresAt: doc.expiresAt?.toISOString(),
        canBeAccessed: doc.canBeAccessed(),
        shouldBeArchived: doc.shouldBeArchived()
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API] Error searching documents:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to search documents',
        code: 'SEARCH_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patient-management/documents
 * Upload a new document
 */
export async function POST(request: NextRequest) {
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

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const patientIdParam = formData.get('patientId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const documentType = formData.get('documentType') as DocumentType
    const tagsParam = formData.get('tags') as string | null
    const isConfidential = formData.get('isConfidential') === 'true'
    const retentionPeriod = formData.get('retentionPeriod') as string | null
    const legalBasis = formData.get('legalBasis') as string | null

    // Validate required fields
    if (!file || !patientIdParam || !title || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, patientId, title, documentType' },
        { status: 400 }
      )
    }

    // Parse tags
    const tags = tagsParam ? JSON.parse(tagsParam) : []

    // Initialize repository and service
    const repository = new SupabaseDocumentRepository(supabase)
    const documentManager = new DocumentManager(repository)

    // Upload document
    const patientId = new PatientId(patientIdParam)
    const uploadedBy = new UserId(user.id)

    const document = await documentManager.uploadDocument(
      {
        patientId,
        file,
        metadata: {
          title,
          description: description || undefined,
          documentType,
          tags,
          isConfidential,
          version: 1,
          retentionPeriod: retentionPeriod ? parseInt(retentionPeriod) : undefined,
          legalBasis: legalBasis || undefined
        }
      },
      uploadedBy
    )

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

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[API] Error uploading document:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload document',
        code: 'UPLOAD_FAILED'
      },
      { status: 500 }
    )
  }
}
