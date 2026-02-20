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

describe('Notification Metadata Property Tests', () => {
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      mockPrisma as any,
      mockDispatcher as any,
      mockPreferencesService as any,
    );
  });

  // Feature: notification-system, Property 10: Metadados da notificação contêm campos obrigatórios por tipo
  // **Validates: Requirements 4.5, 5.4**
  it('should include patientName, date, and time in appointment_reminder metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        async (userId, clinicId, appointmentId, patientName, dateTime) => {
          jest.clearAllMocks();

          mockPreferencesService.getOrCreate.mockResolvedValue({
            id: 'pref-id',
            userId,
            clinicId,
            emailEnabled: true,
            pushEnabled: true,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
          });

          // Capture the create call to inspect metadata
          let capturedMetadata: Record<string, any> | undefined;
          mockPrisma.notification.create.mockImplementation(async (args: any) => {
            capturedMetadata = args.data.metadata;
            return {
              id: 'notif-id',
              ...args.data,
              readAt: null,
              createdAt: new Date(),
            };
          });

          await service.createAppointmentReminder(userId, clinicId, {
            appointmentId,
            patientName,
            dateTime,
          });

          // Metadata must contain required fields for appointment_reminder
          expect(capturedMetadata).toBeDefined();
          expect(capturedMetadata).toHaveProperty('patientName');
          expect(capturedMetadata).toHaveProperty('date');
          expect(capturedMetadata).toHaveProperty('time');
          expect(capturedMetadata!.patientName).toBe(patientName);
          expect(typeof capturedMetadata!.date).toBe('string');
          expect(typeof capturedMetadata!.time).toBe('string');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should include reportType, patientName, and generatedDate in report_ready metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        async (userId, clinicId, reportId, reportType, patientName, generatedDate) => {
          jest.clearAllMocks();

          mockPreferencesService.getOrCreate.mockResolvedValue({
            id: 'pref-id',
            userId,
            clinicId,
            emailEnabled: true,
            pushEnabled: true,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
          });

          // Capture the create call to inspect metadata
          let capturedMetadata: Record<string, any> | undefined;
          mockPrisma.notification.create.mockImplementation(async (args: any) => {
            capturedMetadata = args.data.metadata;
            return {
              id: 'notif-id',
              ...args.data,
              readAt: null,
              createdAt: new Date(),
            };
          });

          await service.createReportNotification(userId, clinicId, {
            reportId,
            reportType,
            patientName,
            generatedDate,
          });

          // Metadata must contain required fields for report_ready
          expect(capturedMetadata).toBeDefined();
          expect(capturedMetadata).toHaveProperty('reportType');
          expect(capturedMetadata).toHaveProperty('patientName');
          expect(capturedMetadata).toHaveProperty('generatedDate');
          expect(capturedMetadata!.reportType).toBe(reportType);
          expect(capturedMetadata!.patientName).toBe(patientName);
          expect(typeof capturedMetadata!.generatedDate).toBe('string');
        },
      ),
      { numRuns: 100 },
    );
  });
});
