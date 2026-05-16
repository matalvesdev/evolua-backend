import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Audit log helper — testes focados em fail-safety.
 *
 * `audit()` NUNCA pode propagar exceções para o handler — qualquer erro
 * é apenas logado como warning. Isto é crítico: uma falha no audit não
 * pode bloquear/derrubar uma operação clínica em andamento.
 */

const prismaMock = {
  auditLog: {
    create: vi.fn(),
  },
};

const loggerMock = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/logger.js', () => ({ logger: loggerMock }));

const { audit, auditAsync } = await import('./audit.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('audit()', () => {
  it('persiste entrada com campos obrigatórios', async () => {
    prismaMock.auditLog.create.mockResolvedValueOnce({});
    await audit({
      clinicId: 'c1',
      userId: 'u1',
      action: 'CREATE',
      resource: 'Patient',
      resourceId: 'p1',
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clinicId: 'c1',
        userId: 'u1',
        action: 'CREATE',
        resource: 'Patient',
        resourceId: 'p1',
      }),
    });
  });

  it('preenche null em campos opcionais ausentes', async () => {
    prismaMock.auditLog.create.mockResolvedValueOnce({});
    await audit({ clinicId: 'c1', action: 'READ', resource: 'X' });
    const arg = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(arg.userId).toBeNull();
    expect(arg.resourceId).toBeNull();
    expect(arg.ipAddress).toBeNull();
    expect(arg.userAgent).toBeNull();
    expect(arg.metadata).toBeNull();
  });

  it('NÃO propaga exceção quando o insert falha', async () => {
    prismaMock.auditLog.create.mockRejectedValueOnce(new Error('DB down'));
    await expect(
      audit({ clinicId: 'c1', action: 'CREATE', resource: 'X' }),
    ).resolves.toBeUndefined();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'audit log failed',
    );
  });

  it('warn não inclui metadata bruta (PII safety)', async () => {
    prismaMock.auditLog.create.mockRejectedValueOnce(new Error('boom'));
    await audit({
      clinicId: 'c1',
      action: 'CREATE',
      resource: 'X',
      metadata: { pii: 'sensitive' },
    });
    const warnArg = loggerMock.warn.mock.calls[0][0];
    expect(warnArg.entry.metadata).toBeUndefined();
  });
});

describe('auditAsync()', () => {
  it('é fire-and-forget (retorna void síncrono)', () => {
    prismaMock.auditLog.create.mockResolvedValueOnce({});
    const r = auditAsync({ clinicId: 'c1', action: 'READ', resource: 'X' });
    expect(r).toBeUndefined();
  });
});
