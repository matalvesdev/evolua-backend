export type DefaultNodeEnvironment = 'development' | 'production';

/**
 * Render is always an internet-facing deployment in this project. If the
 * dashboard omits NODE_ENV, fail closed instead of enabling development-only
 * behavior such as Swagger UI and relaxed transport headers.
 */
export function resolveDefaultNodeEnvironment(render?: string): DefaultNodeEnvironment {
  return render === 'true' ? 'production' : 'development';
}
