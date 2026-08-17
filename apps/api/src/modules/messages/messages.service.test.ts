import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { CreateMessageInput } from '@evolua/contracts';

const prismaMock = {
  patient: { findFirst: vi.fn() },
  message: { create: vi.fn(), findFirst: vi.fn() },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../config/env.js', () => ({
  env: { WHATSAPP_SERVICE_URL: 'http://whatsapp.test', INTERNAL_SERVICE_TOKEN: 'test' },
}));
vi.mock('../../lib/email-client.js', () => ({ emailClient: { sendEmail: vi.fn() } }));
vi.mock('../../lib/logger.js', () => ({ logger: { warn: vi.fn() } }));
vi.mock('../../plugins/metrics.js', () => ({ recordDeliveryAttempt: vi.fn() }));

const { MessagesService } = await import('./messages.service.js');

const input: CreateMessageInput = {
  patientId: 'patient-a',
  content: 'Lembrete de atendimento',
  templateType: 'reminder',
  recipientName: 'Ignorado pelo servidor',
  recipientPhone: '+5511999999999',
  channel: 'whatsapp',
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.patient.findFirst.mockResolvedValue({
    id: 'patient-a', name: 'Paciente', phone: '+5511999999999', guardianPhone: null, email: null,
  });
});

describe('MessagesService idempotency', () => {
  it('recusa reutilizar uma chave para outra mensagem', async () => {
    prismaMock.message.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
      'unique conflict',
      { code: 'P2002', clientVersion: 'test' },
    ));
    prismaMock.message.findFirst.mockResolvedValueOnce({
      id: 'message-existing', clinicId: 'clinic-a', idempotencyKey: 'message-key',
      patientId: 'patient-a', content: 'Outra mensagem', templateType: 'reminder', channel: 'whatsapp',
    });
    const service = new MessagesService();

    await expect(service.create('clinic-a', 'therapist-a', input, 'message-key'))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});
