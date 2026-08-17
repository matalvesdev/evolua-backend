import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { resolveClinicId } = await import('./auth.helpers.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveClinicId', () => {
  it('deriva a clínica exclusivamente do usuário autenticado', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ clinicId: 'clinic-authenticated' });

    await expect(resolveClinicId('user-authenticated')).resolves.toBe('clinic-authenticated');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-authenticated' },
      select: { clinicId: true },
    });
  });

  it('recusa usuário sem clínica em vez de permitir escopo de tenant ausente', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(resolveClinicId('user-without-clinic')).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
