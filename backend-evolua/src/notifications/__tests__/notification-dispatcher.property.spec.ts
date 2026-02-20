import * as fc from 'fast-check';
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

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('NotificationDispatcher Property Tests', () => {
  let service: NotificationDispatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationDispatcherService(
      mockPreferencesService as any,
      mockEmailService as any,
      mockWebPushService as any,
      mockPrisma as any,
    );
  });

  // Feature: notification-system, Property 4: Despacho respeita preferências de canal
  // **Validates: Requirements 2.1, 2.2, 3.1, 3.2**
  it('should dispatch to a channel if and only if the corresponding preference is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.boolean(),
        fc.boolean(),
        fc.emailAddress(),
        async (userId, clinicId, notificationId, title, body, emailEnabled, pushEnabled, userEmail) => {
          jest.clearAllMocks();

          const notification = {
            id: notificationId,
            userId,
            clinicId,
            type: 'general',
            title,
            body,
            metadata: null,
            readAt: null,
            createdAt: new Date(),
          };

          mockPreferencesService.getOrCreate.mockResolvedValue({
            id: 'pref-id',
            userId,
            clinicId,
            emailEnabled,
            pushEnabled,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
          });

          mockPrisma.user.findUnique.mockResolvedValue({ email: userEmail });
          mockEmailService.sendEmail.mockResolvedValue(null);
          mockWebPushService.sendToUser.mockResolvedValue(undefined);

          await service.dispatch(notification as any);

          // Email channel: called iff emailEnabled is true
          if (emailEnabled) {
            expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
            expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
              to: userEmail,
              subject: title,
              htmlBody: body,
            });
          } else {
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
          }

          // Push channel: called iff pushEnabled is true
          if (pushEnabled) {
            expect(mockWebPushService.sendToUser).toHaveBeenCalledTimes(1);
            expect(mockWebPushService.sendToUser).toHaveBeenCalledWith(
              userId,
              clinicId,
              {
                title,
                body,
                data: undefined,
              },
            );
          } else {
            expect(mockWebPushService.sendToUser).not.toHaveBeenCalled();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
