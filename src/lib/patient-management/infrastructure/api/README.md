# API Middleware and Security

This directory contains middleware utilities for securing and monitoring API endpoints in the Patient Management System.

## Features

- **Authentication & Authorization**: Verify user identity and permissions
- **Request/Response Logging**: Comprehensive audit trail of all API requests
- **Rate Limiting**: Prevent abuse and ensure fair usage
- **Security Headers**: Protect against common web vulnerabilities
- **CORS Support**: Configure cross-origin resource sharing
- **Error Handling**: Standardized error responses

## Requirements

- **1.4**: Universal Access Logging - All patient data access is logged
- **5.2**: LGPD Compliance - Data access authorization and logging
- **8.1**: Audit Trail - Comprehensive activity logging for compliance

## Quick Start

### Basic Protected Endpoint

```typescript
import { createProtectedApiHandler, successResponse } from '@/lib/patient-management/infrastructure/api'

export const GET = createProtectedApiHandler(
  async (request, context) => {
    // context.user contains authenticated user
    // context.supabase is the authenticated Supabase client
    
    const data = await fetchSomeData(context.user.id)
    return successResponse(data)
  }
)
```

### Admin-Only Endpoint

```typescript
import { createAdminApiHandler, successResponse } from '@/lib/patient-management/infrastructure/api'

export const DELETE = createAdminApiHandler(
  async (request, context) => {
    // Only users with 'admin' role can access this
    await performAdminAction()
    return successResponse({ success: true })
  }
)
```

### Public Endpoint

```typescript
import { createPublicApiHandler, successResponse } from '@/lib/patient-management/infrastructure/api'

export const GET = createPublicApiHandler(
  async (request, context) => {
    // No authentication required
    const publicData = await fetchPublicData()
    return successResponse(publicData)
  }
)
```

### With Rate Limiting

```typescript
import { createProtectedApiHandler, successResponse } from '@/lib/patient-management/infrastructure/api'

export const POST = createProtectedApiHandler(
  async (request, context) => {
    const body = await request.json()
    const result = await processData(body)
    return successResponse(result)
  },
  {
    rateLimit: {
      windowMs: 60000,  // 1 minute
      maxRequests: 10   // 10 requests per minute
    }
  }
)
```

### With Custom Permissions

```typescript
import { createApiHandler, successResponse, forbiddenError } from '@/lib/patient-management/infrastructure/api'

export const PATCH = createApiHandler(
  async (request, context) => {
    // Custom permission check
    const hasPermission = await checkCustomPermission(context.user.id)
    if (!hasPermission) {
      return forbiddenError('You do not have permission to perform this action')
    }
    
    const result = await updateResource()
    return successResponse(result)
  },
  {
    requireAuth: true,
    requirePermission: 'patient:write'
  }
)
```

## Middleware Components

### Authentication Middleware

Verifies that the request includes valid authentication credentials and attaches the authenticated user to the request context.

```typescript
import { withAuth } from '@/lib/patient-management/infrastructure/api'

const response = await withAuth(request, async (req, context) => {
  // context.user is the authenticated user
  // context.supabase is the authenticated Supabase client
  return NextResponse.json({ userId: context.user.id })
})
```

### Authorization Middleware

Checks if the authenticated user has the required role or permission.

```typescript
import { withAuthorization } from '@/lib/patient-management/infrastructure/api'

const hasAccess = await withAuthorization(
  context,
  'admin',              // required role
  'patient:delete'      // required permission
)
```

### Logging Middleware

Logs all API requests and responses for audit trail and security monitoring.

```typescript
import { withLogging } from '@/lib/patient-management/infrastructure/api'

const response = await withLogging(request, context, async (req, ctx) => {
  // Your handler logic
  return NextResponse.json({ data: 'result' })
})
```

Logs include:
- Request ID (unique identifier)
- HTTP method and path
- User ID and email
- Timestamp
- Request duration
- Response status code
- Error messages (if any)
- IP address
- User agent

### Rate Limiting Middleware

Prevents abuse by limiting the number of requests per user within a time window.

```typescript
import { applyRateLimit } from '@/lib/patient-management/infrastructure/api'

const rateLimitResponse = await applyRateLimit(context, {
  windowMs: 60000,    // 1 minute window
  maxRequests: 100    // 100 requests per window
})

if (rateLimitResponse) {
  return rateLimitResponse  // Rate limit exceeded
}
```

### Security Headers Middleware

Adds security headers to protect against common web vulnerabilities:

- Content Security Policy (CSP)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security (HSTS)

```typescript
import { addSecurityHeaders } from '@/lib/patient-management/infrastructure/api'

let response = NextResponse.json({ data: 'result' })
response = addSecurityHeaders(response)
```

### CORS Middleware

Configures Cross-Origin Resource Sharing for API endpoints.

```typescript
import { withCORS } from '@/lib/patient-management/infrastructure/api'

let response = NextResponse.json({ data: 'result' })
response = withCORS(request, response, [
  'https://example.com',
  'https://app.example.com'
])
```

## Response Helpers

### Success Responses

```typescript
import {
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse
} from '@/lib/patient-management/infrastructure/api'

// Standard success (200)
return successResponse({ data: 'result' })

// Created (201)
return createdResponse({ id: '123', name: 'New Resource' })

// No content (204)
return noContentResponse()

// Paginated response
return paginatedResponse(
  [{ id: 1 }, { id: 2 }],
  {
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10,
    hasNext: true,
    hasPrevious: false
  }
)
```

### Error Responses

```typescript
import {
  errorResponse,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  rateLimitError
} from '@/lib/patient-management/infrastructure/api'

// Generic error
return errorResponse('Something went wrong', 'ERROR_CODE', 500)

// Validation error (400)
return validationError('Invalid input', [
  { field: 'email', message: 'Invalid email format' }
])

// Unauthorized (401)
return unauthorizedError('Invalid credentials')

// Forbidden (403)
return forbiddenError('Insufficient permissions')

// Not found (404)
return notFoundError('Resource not found')

// Conflict (409)
return conflictError('Resource already exists', { id: '123' })

// Rate limit exceeded (429)
return rateLimitError(60) // retry after 60 seconds
```

## Request Parsing Helpers

```typescript
import {
  parseJsonBody,
  parseQueryParams,
  getPaginationParams,
  parseFormData,
  validateRequiredFields
} from '@/lib/patient-management/infrastructure/api'

// Parse JSON body
const body = await parseJsonBody<{ name: string }>(request)

// Parse query parameters
const params = parseQueryParams(request)
const name = params.get('name')

// Get pagination parameters
const { page, limit, sortBy, sortOrder } = getPaginationParams(request)

// Parse form data
const formData = await parseFormData(request)
const file = formData.get('file') as File

// Validate required fields
const validation = validateRequiredFields(body, ['name', 'email'])
if (!validation.valid) {
  return validationError(`Missing fields: ${validation.missing.join(', ')}`)
}
```

## Validation Helpers

```typescript
import {
  isValidUUID,
  isValidEmail,
  isValidDate
} from '@/lib/patient-management/infrastructure/api'

if (!isValidUUID(id)) {
  return validationError('Invalid ID format')
}

if (!isValidEmail(email)) {
  return validationError('Invalid email format')
}

if (!isValidDate(dateString)) {
  return validationError('Invalid date format')
}
```

## Database Schema

The middleware automatically logs all API requests to the `api_request_logs` table. Run the migration script to create the required tables:

```bash
psql -f supabase/api-request-logs-schema.sql
```

### Viewing Logs

```sql
-- View recent API requests
SELECT * FROM api_request_logs
ORDER BY timestamp DESC
LIMIT 100;

-- View API usage statistics
SELECT * FROM api_usage_statistics
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- View security alerts
SELECT * FROM api_security_alerts
WHERE timestamp >= NOW() - INTERVAL '24 hours';
```

## Security Best Practices

1. **Always use authentication** for sensitive endpoints
2. **Implement rate limiting** to prevent abuse
3. **Log all access** to patient data for audit trail
4. **Validate all inputs** before processing
5. **Use HTTPS** in production (enforced by HSTS header)
6. **Keep security headers** enabled
7. **Review logs regularly** for suspicious activity
8. **Set appropriate CORS policies** for your domain

## LGPD Compliance

The middleware ensures LGPD compliance by:

1. **Logging all data access** (Requirement 1.4, 8.1)
2. **Verifying authorization** before data access (Requirement 5.2)
3. **Maintaining audit trails** for 7 years (Requirement 8.3)
4. **Monitoring security events** (Requirement 8.6)
5. **Protecting data in transit** with security headers

## Performance Considerations

- **Rate limiting** uses in-memory storage (use Redis in production)
- **Logging** is asynchronous and doesn't block requests
- **Security headers** add minimal overhead
- **Authentication** caches user data when possible

## Troubleshooting

### Authentication Fails

- Check that Supabase credentials are configured
- Verify the user's session is valid
- Check the `Authorization` header is present

### Rate Limit Issues

- Adjust `windowMs` and `maxRequests` for your use case
- Consider using Redis for distributed rate limiting
- Monitor rate limit metrics in logs

### Logs Not Appearing

- Verify the `api_request_logs` table exists
- Check database permissions
- Review console for logging errors

## Examples

See the `/api/patient-management` endpoints for complete examples of using the middleware in production.
