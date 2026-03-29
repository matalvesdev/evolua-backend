import * as fc from 'fast-check';
import { NotificationPreferencesService } from '../notification-preferences.service';

const mockPrisma = {
  notificationPreference: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

/**
 * **Feature: notifica-integration, Property 6: Round-trip de preferência inAppEnabled**
 *
 * Para qualquer valor booleano de inAppEnabled, atualizar a preferência e em seguida
 * consultar as preferências do mesmo usuário deve retornar o valor atualizado.
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 6: Round-trip de preferência inAppEnabled', () => {
  let service: NotificationPreferencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationPreferencesService(mockPrisma as any);
  });

  it('should return the updated inAppEnabled value after update then getOrCreate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.boolean(),
        async (userId, clinicId, inAppEnabled) => {
          mockPrisma.notificationPreference.upsert.mockClear();
          mockPrisma.notificationPreference.update.mockClear();

          const basePreference = {
            id: 'pref-1',
            userId,
            clinicId,
            emailEnabled: true,
            pushEnabled: true,
            inAppEnabled,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // First upsert call is from update() -> getOrCreate() ensuring record exists
          // Second upsert call is from getOrCreate() after update
          mockPrisma.notificationPreference.upsert.mockResolvedValue(basePreference);

          // update() returns the record with the new inAppEnabled value
          mockPrisma.notificationPreference.update.mockResolvedValue({
            ...basePreference,
            inAppEnabled,
          });

          // Step 1: Update the preference
          const updateResult = await service.update(userId, clinicId, { inAppEnabled });

          // Verify update was called with correct data
          expect(mockPrisma.notificationPreference.update).toHaveBeenCalledWith({
            where: { userId_clinicId: { userId, clinicId } },
            data: { inAppEnabled },
          });
          expect(updateResult.inAppEnabled).toBe(inAppEnabled);

          // Step 2: Simulate getOrCreate returning the updated value
          mockPrisma.notificationPreference.upsert.mockResolvedValue({
            ...basePreference,
            inAppEnabled,
          });

          const getResult = await service.getOrCreate(userId, clinicId);

          // Round-trip: the value read back must match the value written
          expect(getResult.inAppEnabled).toBe(inAppEnabled);
          expect(getResult.inAppEnabled).toBe(updateResult.inAppEnabled);
        },
      ),
      { numRuns: 100 },
    );
  });
});
