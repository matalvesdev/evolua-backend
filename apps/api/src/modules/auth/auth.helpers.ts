import { prisma } from '../../lib/prisma.js';
import { DEFAULT_CLINIC_TIME_ZONE } from '../../lib/timezone.js';

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

/**
 * Autoriza alterações de escopo da clínica a partir da associação persistida.
 * A claim `role` do JWT do Supabase identifica o tipo de token, não o papel
 * funcional da usuária, portanto nunca é usada para esta decisão.
 *
 * Compatibilidade: uma clínica com exatamente uma usuária é tratada como
 * administrada por ela. Em clínicas multiusuário, somente `admin` ou `owner`
 * persistidos no banco podem executar ações administrativas.
 */
export async function requireClinicAdministration(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clinicId: true, role: true },
  });
  if (!user?.clinicId) {
    throw Object.assign(new Error('User has no associated clinic'), { statusCode: 403 });
  }

  const memberCount = await prisma.user.count({ where: { clinicId: user.clinicId } });
  const role = user.role.trim().toLowerCase();
  const isExplicitAdministrator = role === 'admin' || role === 'owner';
  if (isExplicitAdministrator || memberCount === 1) return user.clinicId;

  throw Object.assign(new Error('Clinic administration permission is required'), {
    statusCode: 403,
  });
}

/**
 * Ações clínicas mutáveis exigem autoria do recurso ou administração da
 * clínica. Recursos sem autor definido não são liberados para profissionais
 * comuns em clínicas multiusuárias.
 */
export async function requireResourceOwnerOrClinicAdmin(
  userId: string,
  ownerId: string | null,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clinicId: true, role: true },
  });
  if (!user?.clinicId) {
    throw Object.assign(new Error('User has no associated clinic'), { statusCode: 403 });
  }
  if (ownerId === userId) return user.clinicId;

  const memberCount = await prisma.user.count({ where: { clinicId: user.clinicId } });
  const role = user.role.trim().toLowerCase();
  if (memberCount === 1 || role === 'admin' || role === 'owner') return user.clinicId;

  throw Object.assign(new Error('Resource ownership or clinic administration is required'), {
    statusCode: 403,
  });
}

/** Resolve timezone de uma clínica exclusivamente pela associação autenticada. */
export async function resolveClinicTimeZone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clinic: { select: { timeZone: true } } },
  });
  if (!user?.clinic) {
    throw Object.assign(new Error('User has no associated clinic'), { statusCode: 403 });
  }
  return user.clinic.timeZone || DEFAULT_CLINIC_TIME_ZONE;
}
