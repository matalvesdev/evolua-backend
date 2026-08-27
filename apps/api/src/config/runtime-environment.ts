/**
 * Render is always an internet-facing deployment in this project. If the
 * dashboard omits NODE_ENV or incorrectly sets it to development, fail closed
 * instead of enabling development-only behavior such as Swagger UI and
 * relaxed transport headers. Staging remains an explicit environment.
 */
export function resolveRuntimeNodeEnvironment(nodeEnv?: string, render?: string): string {
  if (render === 'true' && (nodeEnv === undefined || nodeEnv === 'development')) {
    return 'production';
  }
  return nodeEnv ?? 'development';
}
