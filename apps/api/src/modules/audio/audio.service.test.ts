import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateAudioSessionInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  appointment: { findFirst: vi.fn() },
  audioSession: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { AudioService } = await import('./audio.service.js');

beforeEach(() => vi.clearAllMocks());

describe('AudioService tenant and appointment integrity', () => {
  const input: CreateAudioSessionInput = {
    patientId: '0de8a3d3-a728-45ce-bdfb-83a8369c8ce0',
    appointmentId: 'b727316a-0a93-4d86-8e5e-3c990ed594bb',
    audioPath: '0de8a3d3-a728-45ce-bdfb-83a8369c8ce0/session.webm',
  };

  it('rejects an appointment that does not belong to the clinic patient pair', async () => {
    prismaMock.patient.findFirst.mockResolvedValue({ id: input.patientId });
    prismaMock.appointment.findFirst.mockResolvedValue(null);
    const service = new AudioService();

    await expect(service.create('clinic-a', 'therapist-a', input)).rejects.toThrow(
      'Appointment not found for this patient in this clinic',
    );
    expect(prismaMock.audioSession.create).not.toHaveBeenCalled();
  });

  it('issues an upload token only after authorizing the patient tenant', async () => {
    prismaMock.patient.findFirst.mockResolvedValue({ id: input.patientId });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'signed-upload-token' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const service = new AudioService();

    await expect(service.createUploadTarget('clinic-a', {
      patientId: input.patientId,
      contentType: 'audio/webm',
    })).resolves.toEqual(expect.objectContaining({
      path: expect.stringMatching(new RegExp(`^${input.patientId}/.+\\.webm$`)),
      token: 'signed-upload-token',
    }));
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
