// ============================================================================
// PATIENT MANAGEMENT API - DOCUMENT DOWNLOAD ENDPOINT
// REST API endpoint for downloading document files
// Requirements: 2.2
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentManager } from '@/lib/patient-management/application/services/DocumentManager'
import { SupabaseDocumentRepository } from '@/lib/patient-management/infrastructure/repositories/SupabaseDocumentRepository'
import { DocumentId } from '@/lib/patient-management/domain/entities/Document'
import { UserId } from '@/lib/patient-management/domain/value-objects/UserId'

/**
 * GET /api/patient-management/documents/[id]/download
 * Download a document file
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

    // Download document
    const userId = new UserId(user.id)
    const fileBlob = await documentManager.downloadDocument({
      documentId: id as DocumentId,
      userId
    })

    // Get document metadata for filename
    const document = await documentManager.getDocument(id as DocumentId)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Return file as response
    return new NextResponse(fileBlob, {
      status: 200,
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileSize.toString()
      }
    })
  } catch (error) {
    console.error('[API] Error downloading document:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to download document',
        code: 'DOWNLOAD_FAILED'
      },
      { status: 500 }
    )
  }
}
