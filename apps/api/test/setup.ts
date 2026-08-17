/**
 * Setup mínimo de envs para que `src/config/env.ts` valide com sucesso
 * em testes unitários. Carregado por `vitest.config.ts` antes de qualquer import.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-svc';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-min-16-chars';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
process.env.SUPABASE_AUTH_HOOK_SECRET = 'test-auth-hook-signing-secret';
process.env.EVOLUTION_WEBHOOK_SECRET = 'test-evolution-webhook-signing-secret';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.PIX_KEY = 'pix@evolua.app';
