import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const {
  requireClinicAdministration,
  requireResourceOwnerOrClinicAdmin,
  resolveClinicId,
  resolveClinicTimeZone,
} = await import('./auth.helpers.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveClinicTimeZone', () => {
  it('obtém timezone pela associação persistida, não por entrada do cliente', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ clinic: { timeZone: 'America/Manaus' } });

    await expect(resolveClinicTimeZone('user-a')).resolves.toBe('America/Manaus');
  });
});

describe('requireResourceOwnerOrClinicAdmin', () => {
  it('permite a autora do recurso clínico', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ clinicId: 'clinic-a', role: 'therapist' });

    await expect(requireResourceOwnerOrClinicAdmin('therapist-a', 'therapist-a'))
      .resolves.toBe('clinic-a');
    expect(prismaMock.user.count).not.toHaveBeenCalled();
  });

  it('recusa profissional sem ownership em clínica multiusuária', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ clinicId: 'clinic-a', role: 'therapist' });
    prismaMock.user.count.mockResolvedValueOnce(2);

    await expect(requireResourceOwnerOrClinicAdmin('therapist-b', 'therapist-a'))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('requireClinicAdministration', () => {
  it('aceita admin persistido, independentemente da claim do JWT', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ clinicId: 'clinic-a', role: 'ADMIN' });
    prismaMock.user.count.mockResolvedValueOnce(2);

    await expect(requireClinicAdministration('admin-a')).resolves.toBe('clinic-a');
  });

  it('aceita clínica com uma única usuária para não bloquear o fluxo solo', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ clinicId: 'clinic-a', role: 'therapist' });
    prismaMock.user.count.mockResolvedValueOnce(1);

    await expect(requireClinicAdministration('solo-a')).resolves.toBe('clinic-a');
  });

  it('falha fechado para profissional sem privilégio em clínica multiusuária', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ clinicId: 'clinic-a', role: 'therapist' });
    prismaMock.user.count.mockResolvedValueOnce(2);

    await expect(requireClinicAdministration('therapist-a')).rejects.toMatchObject({
      statusCode: 403,
    });
  });
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
