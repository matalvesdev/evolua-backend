import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Admin client (service_role). Bypassa RLS — usar APENAS server-side
 * para fluxos que exigem privilégio (criar usuário, listar todos, etc).
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

/**
 * Constrói um client autenticado em nome do usuário, com RLS aplicada
 * via JWT do próprio usuário (header Authorization: Bearer <token>).
 */
export function supabaseFor(userJwt: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${userJwt}` },
    },
  });
}
