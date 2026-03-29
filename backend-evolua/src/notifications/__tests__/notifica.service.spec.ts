import { NotificaService } from '../notifica.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPost = jest.fn();

mockedAxios.create.mockReturnValue({
  post: mockPost,
} as any);

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      NOTIFICA_API_KEY: 'sk_test_123',
      NOTIFICA_PUBLISHABLE_KEY: 'pk_live_abc',
      NOTIFICA_TEMPLATE_APPOINTMENT_REMINDER: 'tmpl_appt',
      NOTIFICA_TEMPLATE_REPORT_READY: 'tmpl_report',
      NOTIFICA_TEMPLATE_WELCOME: 'tmpl_welcome',
    };
    return config[key] ?? defaultValue;
  }),
};

describe('NotificaService', () => {
  let service: NotificaService;
  const loggerErrorSpy = jest.fn();
  const loggerLogSpy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({ post: mockPost } as any);
    service = new NotificaService(mockConfigService as any);
    (service as any).logger.error = loggerErrorSpy;
    (service as any).logger.log = loggerLogSpy;
  });

  // **Validates: Requirements 1.1, 1.4, 1.5**
  it('upsertSubscriber with complete user generates correct payload', async () => {
    mockPost.mockResolvedValue({ data: {} });

    await service.upsertSubscriber({
      externalId: 'user-123',
      email: 'maria@example.com',
      name: 'Maria Silva',
      phone: '+5511999999999',
      locale: 'pt-BR',
      customProperties: { clinicId: 'clinic-456' },
    });

    expect(mockPost).toHaveBeenCalledWith('/subscribers', {
      external_id: 'user-123',
      email: 'maria@example.com',
      name: 'Maria Silva',
      phone: '+5511999999999',
      locale: 'pt-BR',
      custom_properties: { clinicId: 'clinic-456' },
    });
  });

  // **Validates: Requirement 1.1**
  it('upsertSubscriber with user without phone omits phone field', async () => {
    mockPost.mockResolvedValue({ data: {} });

    await service.upsertSubscriber({
      externalId: 'user-789',
      email: 'joao@example.com',
      name: 'João Santos',
      customProperties: { clinicId: 'clinic-456' },
    });

    const payload = mockPost.mock.calls[0][1];
    expect(payload).not.toHaveProperty('phone');
    expect(payload).toEqual({
      external_id: 'user-789',
      email: 'joao@example.com',
      name: 'João Santos',
      locale: 'pt-BR',
      custom_properties: { clinicId: 'clinic-456' },
    });
  });

  // **Validates: Requirement 1.3**
  it('upsertSubscriber does not throw when API returns 500', async () => {
    mockPost.mockRejectedValue(new Error('Request failed with status code 500'));

    await expect(
      service.upsertSubscriber({
        externalId: 'user-err',
        email: 'err@example.com',
        name: 'Error User',
      }),
    ).resolves.toBeUndefined();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Falha ao sincronizar subscriber user-err'),
    );
  });

  // **Validates: Requirement 1.3**
  it('upsertSubscriber does not throw on API timeout', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.name = 'AxiosError';
    (timeoutError as any).code = 'ECONNABORTED';
    mockPost.mockRejectedValue(timeoutError);

    await expect(
      service.upsertSubscriber({
        externalId: 'user-timeout',
        email: 'timeout@example.com',
        name: 'Timeout User',
      }),
    ).resolves.toBeUndefined();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Falha ao sincronizar subscriber user-timeout'),
    );
  });

  // **Validates: Requirements 4.1, 4.2**
  it('sendNotification with templateId generates payload with template', async () => {
    mockPost.mockResolvedValue({
      data: {
        id: 'notif-1',
        channel: 'email',
        status: 'sent',
        recipient: 'user-123',
        created_at: '2025-01-15T00:00:00Z',
      },
    });

    const result = await service.sendNotification({
      subscriberId: 'user-123',
      channel: 'email',
      templateId: 'tmpl_appt',
      variables: { name: 'Maria', date: '15/01/2025', time: '14:00' },
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/notifications',
      {
        channel: 'email',
        subscriber_id: 'user-123',
        template_id: 'tmpl_appt',
        variables: { name: 'Maria', date: '15/01/2025', time: '14:00' },
      },
      { headers: {} },
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 'notif-1', channel: 'email' }),
    );
  });

  // **Validates: Requirements 4.1, 4.2**
  it('sendNotification without templateId generates payload with inline content', async () => {
    mockPost.mockResolvedValue({
      data: {
        id: 'notif-2',
        channel: 'email',
        status: 'sent',
        recipient: 'user-456',
        created_at: '2025-01-15T00:00:00Z',
      },
    });

    const result = await service.sendNotification({
      subscriberId: 'user-456',
      channel: 'email',
      payload: {
        from: 'noreply@useevolua.com',
        subject: 'Lembrete',
        html_body: '<p>Olá</p>',
        text_body: 'Olá',
      },
    });

    const callArgs = mockPost.mock.calls[0];
    const payload = callArgs[1];
    expect(payload).not.toHaveProperty('template_id');
    expect(payload).toEqual({
      channel: 'email',
      subscriber_id: 'user-456',
      payload: {
        from: 'noreply@useevolua.com',
        subject: 'Lembrete',
        html_body: '<p>Olá</p>',
        text_body: 'Olá',
      },
    });
    expect(result).toEqual(
      expect.objectContaining({ id: 'notif-2', channel: 'email' }),
    );
  });
});
