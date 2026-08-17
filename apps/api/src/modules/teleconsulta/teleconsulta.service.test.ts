import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  teleSession: { create: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../lib/logger.js', () => ({ logger: { info: vi.fn() } }));

const { TeleconsultaService } = await import('./teleconsulta.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TeleconsultaService tenant isolation', () => {
  it('recusa criar sessão para paciente de outra clínica', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null);
    const service = new TeleconsultaService();

    await expect(service.create('clinic-a', {
      patientId: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
      date: '2026-08-14',
      time: '12:00',
      link: 'https://teleconsulta.example/sala-privada',
      sendWA: false,
    })).rejects.toMatchObject({ statusCode: 404 });

    expect(prismaMock.teleSession.create).not.toHaveBeenCalled();
  });

  it('não finge enviar um link pelo WhatsApp sem integração configurada', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce({ id: 'patient-a', name: 'Paciente' });
    const service = new TeleconsultaService();

    await expect(service.create('clinic-a', {
      patientId: 'patient-a',
      date: '2026-08-14',
      time: '12:00',
      link: 'https://teleconsulta.example/sala-privada',
      sendWA: true,
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.teleSession.create).not.toHaveBeenCalled();
  });
});
