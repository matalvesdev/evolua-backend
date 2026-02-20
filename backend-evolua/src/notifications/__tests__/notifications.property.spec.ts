import * as fc from 'fast-check';
import { ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Mock PrismaService
const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

// Mock NotificationDispatcherService
const mockDispatcher = {
  dispatch: jest.fn().mockResolvedValue(undefined),
};

// Mock NotificationPreferencesService
const mockPreferencesService = {
  getOrCreate: jest.fn(),
  update: jest.fn(),
};

// Generators
const notificationTypeArb = fc.oneof(
  fc.constant('appointment_reminder' as const),
  fc.constant('report_ready' as const),
  fc.constant('general' as const),
);

const notificationArb = (userId: string, clinicId: string) =>
  fc.record({
    id: fc.uuid(),
    userId: fc.constant(userId),
    clinicId: fc.constant(clinicId),
    type: notificationTypeArb,
    title: fc.string({ minLength: 1, maxLength: 100 }),
    body: fc.string({ minLength: 1, maxLength: 500 }),
    metadata: fc.constant(null),
    readAt: fc.constant(null as Date | null),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31'),
    }),
  });

describe('Notifications Property Tests', () => {
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(mockPrisma as any, mockDispatcher as any, mockPreferencesService as any);
  });

  // Feature: notification-system, Property 11: Notificações ordenadas por data decrescente
  // **Validates: Requirement 6.1**
  it('should return notifications ordered by createdAt descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 2, max: 20 }),
        async (userId, clinicId, count) => {
          // Generate random dates and sort them descending
          const dates: Date[] = [];
          for (let i = 0; i < count; i++) {
            dates.push(
              new Date(
                Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
              ),
            );
          }
          dates.sort((a, b) => b.getTime() - a.getTime());

          const notifications = dates.map((date, index) => ({
            id: `notif-${index}`,
            userId,
            clinicId,
            type: 'general',
            title: `Notification ${index}`,
            body: `Body ${index}`,
            metadata: null,
            readAt: null,
            createdAt: date,
          }));

          mockPrisma.notification.findMany.mockResolvedValue(notifications);
          mockPrisma.notification.count.mockResolvedValue(count);

          const pagination = new PaginationDto();
          pagination.page = 1;
          pagination.limit = 100;

          const result = await service.findAll(userId, clinicId, pagination);

          // Verify ordering: each notification's createdAt >= next notification's createdAt
          for (let i = 0; i < result.data.length - 1; i++) {
            expect(
              result.data[i].createdAt.getTime(),
            ).toBeGreaterThanOrEqual(result.data[i + 1].createdAt.getTime());
          }

          // Verify the query used correct filters and ordering
          expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId, clinicId },
              orderBy: { createdAt: 'desc' },
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: notification-system, Property 12: Marcar como lida define readAt
  // **Validates: Requirement 6.2**
  it('should set readAt to a non-null timestamp when marking a notification as read', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (notificationId, userId, clinicId, title, body) => {
          const unreadNotification = {
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

          const readTimestamp = new Date();
          const readNotification = {
            ...unreadNotification,
            readAt: readTimestamp,
          };

          mockPrisma.notification.findFirst.mockResolvedValue(unreadNotification);
          mockPrisma.notification.update.mockResolvedValue(readNotification);

          const result = await service.markAsRead(notificationId, userId, clinicId);

          // readAt must be non-null after marking as read
          expect(result.readAt).not.toBeNull();
          expect(result.readAt).toBeInstanceOf(Date);

          // Verify findFirst checked ownership with userId + clinicId
          expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
            where: { id: notificationId, userId, clinicId },
          });

          // Verify update was called with readAt set
          expect(mockPrisma.notification.update).toHaveBeenCalledWith({
            where: { id: notificationId },
            data: { readAt: expect.any(Date) },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: notification-system, Property 13: Marcar todas como lidas zera contagem de não lidas
  // **Validates: Requirement 6.3**
  it('should result in zero unread count after marking all as read', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 50 }),
        async (userId, clinicId, unreadCount) => {
          // Mock updateMany to return the count of updated notifications
          mockPrisma.notification.updateMany.mockResolvedValue({
            count: unreadCount,
          });

          // Mock count to return 0 after marking all as read
          mockPrisma.notification.count.mockResolvedValue(0);

          // Mark all as read
          const markResult = await service.markAllAsRead(userId, clinicId);
          expect(markResult.count).toBe(unreadCount);

          // Verify updateMany was called with correct filters
          expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
            where: { userId, clinicId, readAt: null },
            data: { readAt: expect.any(Date) },
          });

          // Get unread count - should be zero
          const unreadResult = await service.getUnreadCount(userId, clinicId);
          expect(unreadResult.count).toBe(0);

          // Verify count query filters by readAt: null
          expect(mockPrisma.notification.count).toHaveBeenCalledWith({
            where: { userId, clinicId, readAt: null },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: notification-system, Property 14: Contagem de não lidas é consistente
  // **Validates: Requirement 6.4**
  it('should return unread count equal to the number of notifications where readAt is null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            read: fc.boolean(),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        async (userId, clinicId, notificationStates) => {
          // Calculate expected unread count from generated data
          const expectedUnreadCount = notificationStates.filter(
            (n) => !n.read,
          ).length;

          // Mock count to return the expected unread count
          mockPrisma.notification.count.mockResolvedValue(expectedUnreadCount);

          const result = await service.getUnreadCount(userId, clinicId);

          // The returned count must equal the number of notifications where readAt is null
          expect(result.count).toBe(expectedUnreadCount);

          // Verify the query filters by readAt: null for the correct user and clinic
          expect(mockPrisma.notification.count).toHaveBeenCalledWith({
            where: { userId, clinicId, readAt: null },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: notification-system, Property 15: Isolamento multi-tenant
  // **Validates: Requirements 6.5, 7.2, 7.3**
  it('should isolate notifications and operations by clinicId (multi-tenant)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (userA, clinicA, userB, clinicB) => {
          // Ensure different clinics
          fc.pre(clinicA !== clinicB);

          // --- Test 1: findAll always filters by the user's own clinicId ---
          mockPrisma.notification.findMany.mockResolvedValue([]);
          mockPrisma.notification.count.mockResolvedValue(0);

          const pagination = new PaginationDto();
          pagination.page = 1;
          pagination.limit = 20;

          await service.findAll(userA, clinicA, pagination);

          expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId: userA, clinicId: clinicA },
            }),
          );

          jest.clearAllMocks();

          await service.findAll(userB, clinicB, pagination);

          expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId: userB, clinicId: clinicB },
            }),
          );

          jest.clearAllMocks();

          // --- Test 2: markAsRead rejects if notification belongs to different clinic ---
          mockPrisma.notification.findFirst.mockResolvedValue(null);

          const notificationId = 'some-notification-id';
          await expect(
            service.markAsRead(notificationId, userA, clinicA),
          ).rejects.toThrow(ForbiddenException);

          // Verify the query included clinicId filter
          expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
            where: { id: notificationId, userId: userA, clinicId: clinicA },
          });

          jest.clearAllMocks();

          // --- Test 3: getUnreadCount always filters by clinicId ---
          mockPrisma.notification.count.mockResolvedValue(5);

          await service.getUnreadCount(userA, clinicA);

          expect(mockPrisma.notification.count).toHaveBeenCalledWith({
            where: { userId: userA, clinicId: clinicA, readAt: null },
          });

          jest.clearAllMocks();

          // --- Test 4: markAllAsRead always filters by clinicId ---
          mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

          await service.markAllAsRead(userB, clinicB);

          expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
            where: { userId: userB, clinicId: clinicB, readAt: null },
            data: { readAt: expect.any(Date) },
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
