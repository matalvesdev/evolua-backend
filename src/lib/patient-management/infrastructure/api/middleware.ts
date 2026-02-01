// ============================================================================
// API MIDDLEWARE
// Middleware utilities for authentication, authorization, logging, and security
// Requirements: 1.4, 5.2, 8.1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient, User } from '@supabase/supabase-js'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AuthenticatedRequest extends NextRequest {
  user?: User
  supabase?: SupabaseClient
}

export interface MiddlewareContext {
  user: User
  supabase: SupabaseClient
  requestId: string
  startTime: number
}

export interface RequestLog {
  requestId: string
  method: string
  path: string
  userId?: string
  userEmail?: string
  timestamp: Date
  duration?: number
  statusCode?: number
  error?: string
  ipAddress?: string
  userAgent?: string
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Authenticate the request and attach user to context
 * Requirements: 5.2, 8.1
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, context: MiddlewareContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Create middleware context
    const context: MiddlewareContext = {
      user,
      supabase,
      requestId: crypto.randomUUID(),
      startTime: Date.now()
    }

    // Call the handler with authenticated context
    return await handler(request, context)
  } catch (error) {
    console.error('[Middleware] Authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', code: 'AUTH_FAILED' },
      { status: 500 }
    )
  }
}

/**
 * Check if user has required role/permission
 * Requirements: 5.2
 */
export async function withAuthorization(
  context: MiddlewareContext,
  requiredRole?: string,
  requiredPermission?: string
): Promise<boolean> {
  try {
    // Get user metadata from Supabase
    const { data: profile, error } = await context.supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', context.user.id)
      .single()

    if (error) {
      console.error('[Middleware] Authorization check failed:', error)
      return false
    }

    // Check role if required
    if (requiredRole && profile.role !== requiredRole) {
      return false
    }

    // Check permission if required
    if (requiredPermission) {
      const permissions = profile.permissions || []
      if (!permissions.includes(requiredPermission)) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error('[Middleware] Authorization error:', error)
    return false
  }
}

// ============================================================================
// REQUEST/RESPONSE LOGGING MIDDLEWARE
// ============================================================================

/**
 * Log all API requests and responses
 * Requirements: 1.4, 8.1
 */
export async function withLogging(
  request: NextRequest,
  context: MiddlewareContext,
  handler: (req: NextRequest, ctx: MiddlewareContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestLog: RequestLog = {
    requestId: context.requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    userId: context.user.id,
    userEmail: context.user.email,
    timestamp: new Date(),
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  // Log request
  console.log('[API Request]', {
    requestId: requestLog.requestId,
    method: requestLog.method,
    path: requestLog.path,
    userId: requestLog.userId,
    timestamp: requestLog.timestamp.toISOString()
  })

  try {
    // Execute handler
    const response = await handler(request, context)

    // Calculate duration
    const duration = Date.now() - context.startTime

    // Log response
    requestLog.duration = duration
    requestLog.statusCode = response.status

    console.log('[API Response]', {
      requestId: requestLog.requestId,
      statusCode: requestLog.statusCode,
      duration: `${duration}ms`
    })

    // Store log in database for audit trail
    await storeRequestLog(context.supabase, requestLog)

    // Add request ID to response headers
    response.headers.set('X-Request-ID', context.requestId)

    return response
  } catch (error) {
    // Log error
    const duration = Date.now() - context.startTime
    requestLog.duration = duration
    requestLog.statusCode = 500
    requestLog.error = error instanceof Error ? error.message : 'Unknown error'

    console.error('[API Error]', {
      requestId: requestLog.requestId,
      error: requestLog.error,
      duration: `${duration}ms`
    })

    // Store error log
    await storeRequestLog(context.supabase, requestLog)

    throw error
  }
}

/**
 * Store request log in database for audit trail
 */
async function storeRequestLog(
  supabase: SupabaseClient,
  log: RequestLog
): Promise<void> {
  try {
    await supabase.from('api_request_logs').insert({
      request_id: log.requestId,
      method: log.method,
      path: log.path,
      user_id: log.userId,
      user_email: log.userEmail,
      timestamp: log.timestamp.toISOString(),
      duration_ms: log.duration,
      status_code: log.statusCode,
      error: log.error,
      ip_address: log.ipAddress,
      user_agent: log.userAgent
    })
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('[Middleware] Failed to store request log:', error)
  }
}

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================

// In-memory rate limit store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limit API requests per user
 * Requirements: 8.1
 */
export async function withRateLimit(
  context: MiddlewareContext,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = `rate_limit:${context.user.id}`
  const now = Date.now()

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Create new window
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    }
    rateLimitStore.set(key, entry)
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime
  }
}

/**
 * Apply rate limiting to request
 */
export async function applyRateLimit(
  context: MiddlewareContext,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await withRateLimit(context, config)

  if (!result.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': config?.maxRequests.toString() || '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }

  return null
}

// ============================================================================
// SECURITY HEADERS MIDDLEWARE
// ============================================================================

/**
 * Add security headers to response
 * Requirements: 8.1
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co"
  )

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // Strict Transport Security (HSTS)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )

  return response
}

// ============================================================================
// CORS MIDDLEWARE
// ============================================================================

/**
 * Handle CORS for API requests
 */
export function withCORS(
  request: NextRequest,
  response: NextResponse,
  allowedOrigins: string[] = []
): NextResponse {
  const origin = request.headers.get('origin')

  // Check if origin is allowed
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-ID'
    )
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
}

/**
 * Handle OPTIONS preflight requests
 */
export function handlePreflight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    return withCORS(request, response)
  }
  return null
}

// ============================================================================
// COMPOSITE MIDDLEWARE
// ============================================================================

/**
 * Apply all middleware to a request handler
 * Requirements: 1.4, 5.2, 8.1
 */
export async function withMiddleware(
  request: NextRequest,
  handler: (req: NextRequest, ctx: MiddlewareContext) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    requireRole?: string
    requirePermission?: string
    rateLimit?: RateLimitConfig
    enableCORS?: boolean
    allowedOrigins?: string[]
  } = {}
): Promise<NextResponse> {
  // Handle preflight requests
  if (options.enableCORS) {
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }
  }

  // Apply authentication if required
  if (options.requireAuth !== false) {
    return await withAuth(request, async (req, context) => {
      // Check authorization if required
      if (options.requireRole || options.requirePermission) {
        const authorized = await withAuthorization(
          context,
          options.requireRole,
          options.requirePermission
        )

        if (!authorized) {
          return NextResponse.json(
            { error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' },
            { status: 403 }
          )
        }
      }

      // Apply rate limiting if configured
      if (options.rateLimit) {
        const rateLimitResponse = await applyRateLimit(context, options.rateLimit)
        if (rateLimitResponse) {
          return rateLimitResponse
        }
      }

      // Apply logging and execute handler
      let response = await withLogging(req, context, handler)

      // Add security headers
      response = addSecurityHeaders(response)

      // Add CORS headers if enabled
      if (options.enableCORS) {
        response = withCORS(req, response, options.allowedOrigins)
      }

      return response
    })
  }

  // If no auth required, just execute handler with security headers
  let response = await handler(request, {
    user: {} as User,
    supabase: {} as SupabaseClient,
    requestId: crypto.randomUUID(),
    startTime: Date.now()
  })

  response = addSecurityHeaders(response)

  if (options.enableCORS) {
    response = withCORS(request, response, options.allowedOrigins)
  }

  return response
}
