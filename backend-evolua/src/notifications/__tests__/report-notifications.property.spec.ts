import * as fc from 'fast-check';
import { NotificationsService } from '../notifications.service';

// Mock PrismaService
const mockPrisma = {
  notification: {
    create: jest.fn(),
  },
};

// Mock NotificationDispatcherService
const mockDispatcher = {
  dispatch: jest.fn().mockResolvedValue(undefined),
};

// Mock NotificationPreferencesService
const mockPreferencesService = {
  getOrCreate: jest.fn(),
};

describe('Report Notifications Property Tests', () => {
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      mockPrisma as any,
      mockDispatcher as any,
      mockPreferencesService as any,
    );
  });

  // Feature: notification-system, Property 9: Criação de notificação de relatório respeita preferências
  // **Validates: Requirements 5.1, 5.2, 5.3**
  it('should create a report notification if and only if reportNotificationsEnabled is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }),
        async (userId, clinicId, reportId, reportEnabled, reportType, patientName, generatedDate) => {
          jest.clearAllMocks();

          mockPreferencesService.getOrCreate.mockResolvedValue({
            id: 'pref-id',
            userId,
            clinicId,
            emailEnabled: true,
            pushEnabled: true,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: reportEnabled,
          });

          const createdNotification = {
            id: 'notif-id',
            userId,
            clinicId,
            type: 'report_ready',
            title: 'Relatório pronto',
            body: `O relatório ${reportType} de ${patientName} está pronto.`,
            metadata: { reportId, reportType, patientName, generatedDate: generatedDate.toISOString() },
            readAt: null,
            createdAt: new Date(),
          };

          mockPrisma.notification.create.mockResolvedValue(createdNotification);

          const result = await service.createReportNotification(userId, clinicId, {
            reportId,
            reportType,
            patientName,
            generatedDate,
          });

          // Preferences must always be checked
          expect(mockPreferencesService.getOrCreate).toHaveBeenCalledWith(userId, clinicId);

          if (reportEnabled) {
            // When enabled, a notification must be created
            expect(result).not.toBeNull();
            expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
            expect(mockPrisma.notification.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  userId,
                  clinicId,
                  type: 'report_ready',
                }),
              }),
            );
          } else {
            // When disabled, no notification should be created
            expect(result).toBeNull();
            expect(mockPrisma.notification.create).not.toHaveBeenCalled();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
