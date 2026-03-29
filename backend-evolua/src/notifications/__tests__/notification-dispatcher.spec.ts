import { NotificationDispatcherService } from '../notification-dispatcher.service';

const mockPreferencesService = {
  getOrCreate: jest.fn(),
};

const mockEmailService = {
  sendEmail: jest.fn(),
};

const mockWebPushService = {
  sendToUser: jest.fn(),
};

const mockNotificaService = {
  sendNotification: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;
  const loggerErrorSpy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationDispatcherService(
      mockPreferencesService as any,
      mockEmailService as any,
      mockWebPushService as any,
      mockNotificaService as any,
      mockPrisma as any,
    );
    // Spy on the logger
    (service as any).logger.error = loggerErrorSpy;
  });

  // **Validates: Requirement 2.3**
  it('should log email send failure and not propagate exception', async () => {
    const notification = {
      id: 'notif-1',
      userId: 'user-1',
      clinicId: 'clinic-1',
      type: 'general',
      title: 'Test Notification',
      body: '<p>Test body</p>',
      metadata: null,
      readAt: null,
      createdAt: new Date(),
    };

    mockPreferencesService.getOrCreate.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      clinicId: 'clinic-1',
      emailEnabled: true,
      pushEnabled: false,
      appointmentRemindersEnabled: true,
      reportNotificationsEnabled: true,
    });

    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    mockEmailService.sendEmail.mockRejectedValue(new Error('SMTP connection failed'));

    // Should not throw
    await expect(service.dispatch(notification as any)).resolves.toBeUndefined();

    // Should have attempted to send email
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Test Notification',
      htmlBody: '<p>Test body</p>',
    });

    // Should have logged the error
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send email'),
    );
  });

  // **Validates: Requirement 2.3**
  it('should continue dispatching to push even if email fails', async () => {
    const notification = {
      id: 'notif-2',
      userId: 'user-1',
      clinicId: 'clinic-1',
      type: 'general',
      title: 'Test',
      body: 'Body',
      metadata: null,
      readAt: null,
      createdAt: new Date(),
    };

    mockPreferencesService.getOrCreate.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      clinicId: 'clinic-1',
      emailEnabled: true,
      pushEnabled: true,
      appointmentRemindersEnabled: true,
      reportNotificationsEnabled: true,
    });

    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    mockEmailService.sendEmail.mockRejectedValue(new Error('Email failed'));
    mockWebPushService.sendToUser.mockResolvedValue(undefined);

    await expect(service.dispatch(notification as any)).resolves.toBeUndefined();

    // Push should still be called despite email failure
    expect(mockWebPushService.sendToUser).toHaveBeenCalledTimes(1);
  });
});
