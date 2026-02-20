import * as fc from 'fast-check';
import { PushSubscriptionsService } from '../push-subscriptions.service';

// Mock PrismaService
const mockPrisma = {
  pushSubscription: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('PushSubscriptions Property Tests', () => {
  let service: PushSubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushSubscriptionsService(mockPrisma as any);
  });

  // Feature: notification-system, Property 5: Round-trip de assinatura push
  // **Validates: Requirement 3.3**
  it('should contain the registered subscription when querying user subscriptions (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.webUrl(),
        fc.base64String({ minLength: 10 }),
        fc.base64String({ minLength: 10 }),
        async (userId, clinicId, subscriptionId, endpoint, p256dh, auth) => {
          const dto = { endpoint, p256dh, auth };

          const createdSubscription = {
            id: subscriptionId,
            userId,
            clinicId,
            endpoint,
            p256dh,
            auth,
            createdAt: new Date(),
          };

          mockPrisma.pushSubscription.create.mockResolvedValue(createdSubscription);
          mockPrisma.pushSubscription.findMany.mockResolvedValue([createdSubscription]);

          // Register the subscription
          const created = await service.create(userId, clinicId, dto);

          // Verify create was called with correct data
          expect(mockPrisma.pushSubscription.create).toHaveBeenCalledWith({
            data: {
              userId,
              clinicId,
              endpoint,
              p256dh,
              auth,
            },
          });

          // Query user's subscriptions
          const subscriptions = await service.findByUser(userId, clinicId);

          // Verify findMany was called with correct filters
          expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
            where: { userId, clinicId },
          });

          // Round-trip: the result should contain a subscription with the same values
          const found = subscriptions.find(
            (s) =>
              s.endpoint === endpoint &&
              s.p256dh === p256dh &&
              s.auth === auth,
          );

          expect(found).toBeDefined();
          expect(found!.endpoint).toBe(endpoint);
          expect(found!.p256dh).toBe(p256dh);
          expect(found!.auth).toBe(auth);
          expect(found!.userId).toBe(userId);
          expect(found!.clinicId).toBe(clinicId);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: notification-system, Property 6: Remoção de assinatura push
  // **Validates: Requirement 3.4**
  it('should not contain the removed subscription when querying after removal', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.webUrl(),
        fc.base64String({ minLength: 10 }),
        fc.base64String({ minLength: 10 }),
        async (userId, clinicId, subscriptionId, endpoint, p256dh, auth) => {
          const existingSubscription = {
            id: subscriptionId,
            userId,
            clinicId,
            endpoint,
            p256dh,
            auth,
            createdAt: new Date(),
          };

          // findFirst returns the subscription (it exists and belongs to the user)
          mockPrisma.pushSubscription.findFirst.mockResolvedValue(existingSubscription);
          mockPrisma.pushSubscription.delete.mockResolvedValue(existingSubscription);
          // After removal, findMany returns empty (subscription is gone)
          mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

          // Remove the subscription
          await service.remove(subscriptionId, userId, clinicId);

          // Verify findFirst checked ownership
          expect(mockPrisma.pushSubscription.findFirst).toHaveBeenCalledWith({
            where: { id: subscriptionId, userId, clinicId },
          });

          // Verify delete was called
          expect(mockPrisma.pushSubscription.delete).toHaveBeenCalledWith({
            where: { id: subscriptionId },
          });

          // Query user's subscriptions after removal
          const subscriptions = await service.findByUser(userId, clinicId);

          // The removed subscription should not be in the results
          const found = subscriptions.find((s) => s.id === subscriptionId);
          expect(found).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});
