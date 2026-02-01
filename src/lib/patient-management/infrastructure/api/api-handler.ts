// ============================================================================
// API HANDLER UTILITIES
// Helper functions to create API route handlers with middleware
// Requirements: 1.4, 5.2, 8.1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { withMiddleware, MiddlewareContext, RateLimitConfig } from './middleware'

// ============================================================================
// TYPES
// ============================================================================

export type ApiHandler = (
  request: NextRequest,
  context: MiddlewareContext
) => Promise<NextResponse>

export interface ApiRouteOptions {
  requireAuth?: boolean
  requireRole?: string
  requirePermission?: string
  rateLimit?: RateLimitConfig
  enableCORS?: boolean
  allowedOrigins?: string[]
}

// ============================================================================
// API HANDLER FACTORY
// ============================================================================

/**
 * Create an API route handler with middleware applied
 * 
 * @example
 * export const GET = createApiHandler(
 *   async (request, context) => {
 *     // Your handler logic here
 *     return NextResponse.json({ data: 'Hello' })
 *   },
 *   { requireAuth: true, rateLimit: { windowMs: 60000, maxRequests: 100 } }
 * )
 */
export function createApiHandler(
  handler: ApiHandler,
  options: ApiRouteOptions = {}
): (request: NextRequest, params?: unknown) => Promise<NextResponse> {
  return async (request: NextRequest, params?: unknown) => {
    try {
      return await withMiddleware(
        request,
        async (req, ctx) => {
          // Attach params to context if provided
          if (params) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ctx as any).params = params
          }
          return await handler(req, ctx)
        },
        options
      )
    } catch (error) {
      console.error('[API Handler] Unhandled error:', error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Create a public API route handler (no authentication required)
 */
export function createPublicApiHandler(
  handler: ApiHandler,
  options: Omit<ApiRouteOptions, 'requireAuth'> = {}
): (request: NextRequest, params?: unknown) => Promise<NextResponse> {
  return createApiHandler(handler, { ...options, requireAuth: false })
}

/**
 * Create a protected API route handler (authentication required)
 */
export function createProtectedApiHandler(
  handler: ApiHandler,
  options: Omit<ApiRouteOptions, 'requireAuth'> = {}
): (request: NextRequest, params?: unknown) => Promise<NextResponse> {
  return createApiHandler(handler, { ...options, requireAuth: true })
}

/**
 * Create an admin-only API route handler
 */
export function createAdminApiHandler(
  handler: ApiHandler,
  options: Omit<ApiRouteOptions, 'requireAuth' | 'requireRole'> = {}
): (request: NextRequest, params?: unknown) => Promise<NextResponse> {
  return createApiHandler(handler, {
    ...options,
    requireAuth: true,
    requireRole: 'admin'
  })
}

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  code: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(details && { details })
    },
    { status }
  )
}

/**
 * Create a validation error response
 */
export function validationError(
  message: string,
  errors: Array<Record<string, unknown>> = []
): NextResponse {
  return errorResponse(
    message,
    'VALIDATION_ERROR',
    400,
    { errors }
  )
}

/**
 * Create an unauthorized error response
 */
export function unauthorizedError(message: string = 'Unauthorized'): NextResponse {
  return errorResponse(message, 'UNAUTHORIZED', 401)
}

/**
 * Create a forbidden error response
 */
export function forbiddenError(message: string = 'Forbidden'): NextResponse {
  return errorResponse(message, 'FORBIDDEN', 403)
}

/**
 * Create a not found error response
 */
export function notFoundError(message: string = 'Not found'): NextResponse {
  return errorResponse(message, 'NOT_FOUND', 404)
}

/**
 * Create a conflict error response
 */
export function conflictError(message: string, details?: Record<string, unknown>): NextResponse {
  return errorResponse(message, 'CONFLICT', 409, details)
}

/**
 * Create a rate limit error response
 */
export function rateLimitError(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString()
      }
    }
  )
}

// ============================================================================
// SUCCESS RESPONSE HELPERS
// ============================================================================

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201)
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
): NextResponse {
  return successResponse({
    data,
    pagination
  })
}

// ============================================================================
// REQUEST PARSING HELPERS
// ============================================================================

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json() as T
  } catch {
    throw new Error('Invalid JSON body')
  }
}

/**
 * Parse query parameters
 */
export function parseQueryParams(request: NextRequest): URLSearchParams {
  return request.nextUrl.searchParams
}

/**
 * Get pagination parameters from query string
 */
export function getPaginationParams(request: NextRequest): {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} {
  const searchParams = parseQueryParams(request)
  
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined
  }
}

/**
 * Parse multipart form data
 */
export async function parseFormData(request: NextRequest): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    throw new Error('Invalid form data')
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      missing.push(field)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate date format
 */
export function isValidDate(date: string): boolean {
  const parsed = Date.parse(date)
  return !isNaN(parsed)
}
