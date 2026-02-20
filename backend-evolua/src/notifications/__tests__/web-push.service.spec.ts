import * as webpush from 'web-push';
import { WebPushService } from '../web-push.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      VAPID_SUBJECT: 'mailto:test@example.com',
      VAPID_PUBLIC_KEY: 'test-public-key',
      VAPID_PRIVATE_KEY: 'test-private-key',
    };
    return config[key] ?? defaultValue;
  }),
};

const mockPushSubscriptionsService = {
  findByUser: jest.fn(),
  removeByEndpoint: jest.fn(),
};

describe('WebPushService', () => {
  let service: WebPushService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WebPushService(
      mockConfigService as any,
      mockPushSubscriptionsService as any,
    );
  });

  // **Validates: Requirement 3.1**
  it('should configure VAPID details on construction', () => {
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'test-public-key',
      'test-private-key',
    );
  });

  // **Validates: Requirement 3.1**
  it('should send push notification to all user subscriptions', async () => {
    const subscriptions = [
      { id: '1', endpoint: 'https://push.example.com/sub1', p256dh: 'key1', auth: 'auth1' },
      { id: '2', endpoint: 'https://push.example.com/sub2', p256dh: 'key2', auth: 'auth2' },
    ];

    mockPushSubscriptionsService.findByUser.mockResolvedValue(subscriptions);
    (webpush.sendNotification as jest.Mock).mockResolvedValue({});

    const payload = { title: 'Test', body: 'Hello' };
    await service.sendToUser('user-1', 'clinic-1', payload);

    expect(mockPushSubscriptionsService.findByUser).toHaveBeenCalledWith('user-1', 'clinic-1');
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.com/sub1', keys: { p256dh: 'key1', auth: 'auth1' } },
      JSON.stringify(payload),
    );
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.com/sub2', keys: { p256dh: 'key2', auth: 'auth2' } },
      JSON.stringify(payload),
    );
  });

  // **Validates: Requirement 3.5**
  it('should remove subscription automatically when push returns 410 Gone', async () => {
    const subscriptions = [
      { id: '1', endpoint: 'https://push.example.com/gone', p256dh: 'key1', auth: 'auth1' },
    ];

    mockPushSubscriptionsService.findByUser.mockResolvedValue(subscriptions);
    mockPushSubscriptionsService.removeByEndpoint.mockResolvedValue(undefined);

    const error = new Error('Push subscription has unsubscribed or expired');
    (error as any).statusCode = 410;
    (webpush.sendNotification as jest.Mock).mockRejectedValue(error);

    await service.sendToUser('user-1', 'clinic-1', { title: 'Test', body: 'Hello' });

    expect(mockPushSubscriptionsService.removeByEndpoint).toHaveBeenCalledWith(
      'https://push.example.com/gone',
    );
  });

  // **Validates: Requirements 3.1, 3.5**
  it('should log errors without propagating exceptions for non-410 errors', async () => {
    const subscriptions = [
      { id: '1', endpoint: 'https://push.example.com/fail', p256dh: 'key1', auth: 'auth1' },
    ];

    mockPushSubscriptionsService.findByUser.mockResolvedValue(subscriptions);

    const error = new Error('Network error');
    (error as any).statusCode = 500;
    (webpush.sendNotification as jest.Mock).mockRejectedValue(error);

    // Should not throw
    await expect(
      service.sendToUser('user-1', 'clinic-1', { title: 'Test', body: 'Hello' }),
    ).resolves.toBeUndefined();

    // Should NOT remove the subscription for non-410 errors
    expect(mockPushSubscriptionsService.removeByEndpoint).not.toHaveBeenCalled();
  });

  it('should not throw when findByUser fails', async () => {
    mockPushSubscriptionsService.findByUser.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(
      service.sendToUser('user-1', 'clinic-1', { title: 'Test', body: 'Hello' }),
    ).resolves.toBeUndefined();
  });

  it('should do nothing when user has no subscriptions', async () => {
    mockPushSubscriptionsService.findByUser.mockResolvedValue([]);

    await service.sendToUser('user-1', 'clinic-1', { title: 'Test', body: 'Hello' });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
});
