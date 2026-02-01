// ============================================================================
// API INFRASTRUCTURE - PUBLIC EXPORTS
// Central export point for API middleware and utilities
// ============================================================================

// Middleware exports
export {
  withAuth,
  withAuthorization,
  withLogging,
  withRateLimit,
  applyRateLimit,
  addSecurityHeaders,
  withCORS,
  handlePreflight,
  withMiddleware,
  type AuthenticatedRequest,
  type MiddlewareContext,
  type RequestLog,
  type RateLimitConfig
} from './middleware'

// API handler exports
export {
  createApiHandler,
  createPublicApiHandler,
  createProtectedApiHandler,
  createAdminApiHandler,
  errorResponse,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  rateLimitError,
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  parseJsonBody,
  parseQueryParams,
  getPaginationParams,
  parseFormData,
  validateRequiredFields,
  isValidUUID,
  isValidEmail,
  isValidDate,
  type ApiHandler,
  type ApiRouteOptions
} from './api-handler'
