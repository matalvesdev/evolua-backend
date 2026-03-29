import * as fc from 'fast-check';
import { NotificationsService } from '../notifications.service';

// Mock PrismaService
const mockPrisma = {
  notification: {
    create: jest.fn(),
    deleteMany: jest.fn(),
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

describe('Appointment Notifications Property Tests', () => {
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      mockPrisma as any,
      mockDispatcher as any,
      mockPreferencesService as any,
    );
  });

  // Feature: notification-system, Property 7: Criação de lembrete de agendamento respeita preferências
  // **Validates: Requirements 4.1, 4.2, 4.3**
  it('should create an appointment reminder if and only if appointmentRemindersEnabled is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        async (userId, clinicId, appointmentId, remindersEnabled, patientName, dateTime) => {
          jest.clearAllMocks();

          mockPreferencesService.getOrCreate.mockResolvedValue({
            id: 'pref-id',
            userId,
            clinicId,
            emailEnabled: true,
            pushEnabled: true,
            appointmentRemindersEnabled: remindersEnabled,
            reportNotificationsEnabled: true,
          });

          const createdNotification = {
            id: 'notif-id',
            userId,
            clinicId,
            type: 'appointment_reminder',
            title: 'Lembrete de agendamento',
            body: `Você tem um agendamento com ${patientName}`,
            metadata: { appointmentId, patientName, date: dateTime.toISOString().split('T')[0], time: '00:00' },
            readAt: null,
            createdAt: new Date(),
          };

          mockPrisma.notification.create.mockResolvedValue(createdNotification);

          const result = await service.createAppointmentReminder(userId, clinicId, {
            appointmentId,
            patientName,
            dateTime,
          });

          // Preferences must always be checked
          expect(mockPreferencesService.getOrCreate).toHaveBeenCalledWith(userId, clinicId);

          if (remindersEnabled) {
            // When enabled, a notification must be created
            expect(result).not.toBeNull();
            expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
            expect(mockPrisma.notification.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  userId,
                  clinicId,
                  type: 'appointment_reminder',
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

  // Feature: notification-system, Property 8: Cancelamento de agendamento remove lembrete
  // **Validates: Requirement 4.4**
  it('should remove the associated reminder when an appointment is cancelled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 5 }),
        async (appointmentId, userId, clinicId, deletedCount) => {
          jest.clearAllMocks();

          mockPrisma.notification.deleteMany.mockResolvedValue({
            count: deletedCount,
          });

          const result = await service.removeAppointmentReminder(
            appointmentId,
            userId,
            clinicId,
          );

          // deleteMany must be called with the correct filters
          expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
            where: {
              userId,
              clinicId,
              type: 'appointment_reminder',
              metadata: {
                path: ['appointmentId'],
                equals: appointmentId,
              },
            },
          });

          // Result count must match the number of deleted records
          expect(result.count).toBe(deletedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
