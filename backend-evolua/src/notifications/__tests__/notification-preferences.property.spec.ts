import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { NotificationPreferencesService } from '../notification-preferences.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

// Mock PrismaService
const mockPrisma = {
  notificationPreference: {
    upsert: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('NotificationPreferences Property Tests', () => {
  let service: NotificationPreferencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationPreferencesService(mockPrisma as any);
  });

  // Feature: notification-system, Property 1: Preferências padrão para novos usuários
  // **Validates: Requirements 1.1, 1.3, 1.4**
  it('should return default preferences (all true) for any new user', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, clinicId) => {
        const defaultPrefs = {
          id: 'some-id',
          userId,
          clinicId,
          emailEnabled: true,
          pushEnabled: true,
          appointmentRemindersEnabled: true,
          reportNotificationsEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.notificationPreference.upsert.mockResolvedValue(defaultPrefs);

        const result = await service.getOrCreate(userId, clinicId);

        // Verify the upsert was called with correct userId and clinicId
        expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
          where: { userId_clinicId: { userId, clinicId } },
          create: {
            userId,
            clinicId,
            emailEnabled: true,
            pushEnabled: true,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
          },
          update: {},
        });

        // Verify all defaults are true
        expect(result.emailEnabled).toBe(true);
        expect(result.pushEnabled).toBe(true);
        expect(result.appointmentRemindersEnabled).toBe(true);
        expect(result.reportNotificationsEnabled).toBe(true);

        // Verify correct user and clinic association
        expect(result.userId).toBe(userId);
        expect(result.clinicId).toBe(clinicId);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: notification-system, Property 2: Round-trip de atualização de preferências
  // **Validates: Requirement 1.2**
  it('should return the same values after updating preferences (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        async (
          userId,
          clinicId,
          emailEnabled,
          pushEnabled,
          appointmentRemindersEnabled,
          reportNotificationsEnabled,
        ) => {
          const updateDto: UpdatePreferencesDto = {
            emailEnabled,
            pushEnabled,
            appointmentRemindersEnabled,
            reportNotificationsEnabled,
          };

          const existingPrefs = {
            id: 'some-id',
            userId,
            clinicId,
            emailEnabled: true,
            pushEnabled: true,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const updatedPrefs = {
            ...existingPrefs,
            ...updateDto,
            updatedAt: new Date(),
          };

          // getOrCreate is called first inside update()
          mockPrisma.notificationPreference.upsert.mockResolvedValue(existingPrefs);
          mockPrisma.notificationPreference.update.mockResolvedValue(updatedPrefs);

          const result = await service.update(userId, clinicId, updateDto);

          // Verify the update was called with the correct data
          expect(mockPrisma.notificationPreference.update).toHaveBeenCalledWith({
            where: { userId_clinicId: { userId, clinicId } },
            data: updateDto,
          });

          // Round-trip: returned values must match what was sent
          expect(result.emailEnabled).toBe(emailEnabled);
          expect(result.pushEnabled).toBe(pushEnabled);
          expect(result.appointmentRemindersEnabled).toBe(appointmentRemindersEnabled);
          expect(result.reportNotificationsEnabled).toBe(reportNotificationsEnabled);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: notification-system, Property 3: Rejeição de valores não-booleanos nas preferências
  // **Validates: Requirement 1.5**
  it('should reject non-boolean values in preference fields via DTO validation', async () => {
    // Exclude null/undefined since @IsOptional() allows those (field is simply absent)
    const nonBooleanArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.array(fc.anything()),
      fc.dictionary(fc.string(), fc.anything()),
    );

    await fc.assert(
      fc.asyncProperty(nonBooleanArb, async (nonBooleanValue) => {
        // Test each preference field with a non-boolean value
        const fields = [
          'emailEnabled',
          'pushEnabled',
          'appointmentRemindersEnabled',
          'reportNotificationsEnabled',
        ];

        for (const field of fields) {
          const dto = new UpdatePreferencesDto();
          (dto as any)[field] = nonBooleanValue;

          const errors = await validate(dto);

          // Non-boolean values should produce validation errors
          const fieldErrors = errors.filter((e) => e.property === field);
          expect(fieldErrors.length).toBeGreaterThan(0);
          expect(
            fieldErrors.some((e) => e.constraints && 'isBoolean' in e.constraints),
          ).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
