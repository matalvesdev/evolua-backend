import { prisma } from '../../lib/prisma.js';

/**
 * Resolve a clinicId associada ao usuário autenticado.
 * O JWT do Supabase carrega apenas user.id; clinicId está em public.users.
 *
 * Para queries de alta cardinalidade, considere cache em memória ou Redis.
 */
export async function resolveClinicId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clinicId: true },
  });
  if (!user?.clinicId) {
    const err = new Error('User has no associated clinic');
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
  return user.clinicId;
}
