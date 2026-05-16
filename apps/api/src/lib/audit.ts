import { prisma } from './prisma.js';
import { logger } from './logger.js';

/**
 * Audit Log helper — LGPD Art. 37 (registro de operações).
 *
 * Persiste registros append-only de ações sensíveis (CREATE/READ/UPDATE/DELETE/EXPORT)
 * sobre recursos com PII. NÃO armazenar conteúdo PII em texto puro no campo `metadata`
 * — apenas IDs, diffs estruturais e identificadores.
 *
 * Falhas no log NUNCA propagam para o request — apenas warning.
 */
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'SIGN'
  | 'CONSENT_GRANT'
  | 'CONSENT_REVOKE'
  | 'AUDIO_TRANSCRIBE'
  | 'PORTAL_ACCESS'
  | 'LOGIN'
  | 'LOGOUT';

export type AuditEntry = {
  clinicId: string;
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: entry.clinicId,
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: (entry.metadata ?? null) as never,
      },
    });
  } catch (err) {
    logger.warn({ err, entry: { ...entry, metadata: undefined } }, 'audit log failed');
  }
}

/** Versão fire-and-forget — não bloqueia o handler. */
export function auditAsync(entry: AuditEntry): void {
  void audit(entry);
}
