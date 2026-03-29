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

const mockNotificaService = {
  sendNotification: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

/**
 * **Feature: notifica-integration, Property 3: Dispatch in-app respeita preferências**
 *
 * Para qualquer notificação e qualquer estado de preferências do usuário,
 * o dispatcher deve enviar notificação in-app se e somente se inAppEnabled for true.
 * Quando inAppEnabled for false, nenhuma chamada ao canal in-app deve ser feita.
 *
 * **Validates: Requirements 2.1, 2.3**
 */
describe('Property 3: Dispatch in-app respeita preferências', () => {
  let service: NotificationDispatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@test.com' });
    mockEmailService.sendEmail.mockResolvedValue(undefined);
    mockWebPushService.sendToUser.mockResolvedValue(undefined);
    mockNotificaService.sendNotification.mockResolvedValue({ id: 'n-1' });

    service = new NotificationDispatcherService(
      mockPreferencesService as any,
      mockEmailService as any,
      mockWebPushService as any,
      mockNotificaService as any,
      mockPrisma as any,
    );
    (service as any).logger.error = jest.fn();
  });

  const notificationArbitrary = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    clinicId: fc.uuid(),
    type: fc.constantFrom('general', 'appointment_reminder', 'report_ready'),
    title: fc.string({ minLength: 1 }),
    body: fc.string({ minLength: 1 }),
    metadata: fc.option(
      fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string()),
      { nil: null },
    ),
    readAt: fc.constant(null),
    createdAt: fc.date(),
  });

  it('should call in-app if and only if inAppEnabled is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArbitrary,
        fc.boolean(),
        async (notification, inAppEnabled) => {
          mockPreferencesService.getOrCreate.mockClear();
          mockNotificaService.sendNotification.mockClear();

          mockPreferencesService.getOrCreate.mockResolvedValue({
            id: 'pref-1',
            userId: notification.userId,
            clinicId: notification.clinicId,
            emailEnabled: false,
            pushEnabled: false,
            inAppEnabled,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
          });

          await service.dispatch(notification as any);

          const inAppCalls = mockNotificaService.sendNotification.mock.calls.filter(
            (call: any[]) => call[0]?.channel === 'in_app',
          );

          if (inAppEnabled) {
            expect(inAppCalls).toHaveLength(1);
          } else {
            expect(inAppCalls).toHaveLength(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Feature: notifica-integration, Property 4: Corretude do payload in-app**
 *
 * Para qualquer notificação despachada via canal in-app, o payload enviado à API Notifica
 * deve conter: channel igual a "in_app", subscriber_id igual ao User.id, e payload contendo
 * title, body e metadata com o type da notificação e clinicId do usuário.
 *
 * **Validates: Requirements 2.2, 7.2**
 */
describe('Property 4: Corretude do payload in-app', () => {
  let service: NotificationDispatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@test.com' });
    mockEmailService.sendEmail.mockResolvedValue(undefined);
    mockWebPushService.sendToUser.mockResolvedValue(undefined);
    mockNotificaService.sendNotification.mockResolvedValue({ id: 'n-1' });

    service = new NotificationDispatcherService(
      mockPreferencesService as any,
      mockEmailService as any,
      mockWebPushService as any,
      mockNotificaService as any,
      mockPrisma as any,
    );
    (service as any).logger.error = jest.fn();
  });

  const metadataArbitrary = fc.oneof(
    fc.constant(null),
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.string({ maxLength: 20 }),
    ),
  );

  const notificationArbitrary = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    clinicId: fc.uuid(),
    type: fc.constantFrom('general', 'appointment_reminder', 'report_ready'),
    title: fc.string({ minLength: 1 }),
    body: fc.string({ minLength: 1 }),
    metadata: metadataArbitrary,
    readAt: fc.constant(null),
    createdAt: fc.date(),
  });

  it('should send correct in-app payload with channel, subscriberId, title, body, and metadata', async () => {
    await fc.assert(
      fc.asyncProperty(notificationArbitrary, async (notification) => {
        mockNotificaService.sendNotification.mockClear();
        mockPreferencesService.getOrCreate.mockClear();

        mockPreferencesService.getOrCreate.mockResolvedValue({
          id: 'pref-1',
          userId: notification.userId,
          clinicId: notification.clinicId,
          emailEnabled: false,
          pushEnabled: false,
          inAppEnabled: true,
          appointmentRemindersEnabled: true,
          reportNotificationsEnabled: true,
        });

        await service.dispatch(notification as any);

        expect(mockNotificaService.sendNotification).toHaveBeenCalledTimes(1);

        const callArgs = mockNotificaService.sendNotification.mock.calls[0][0];

        // channel must be 'in_app'
        expect(callArgs.channel).toBe('in_app');

        // subscriberId must equal notification.userId
        expect(callArgs.subscriberId).toBe(notification.userId);

        // payload.title must equal notification.title
        expect(callArgs.payload.title).toBe(notification.title);

        // payload.body must equal notification.body
        expect(callArgs.payload.body).toBe(notification.body);

        // metadata must contain type and clinicId
        expect(callArgs.payload.metadata.type).toBe(notification.type);
        expect(callArgs.payload.metadata.clinicId).toBe(notification.clinicId);

        // metadata must also spread notification.metadata when present
        if (notification.metadata !== null) {
          for (const [key, value] of Object.entries(notification.metadata)) {
            if (key !== 'type' && key !== 'clinicId') {
              expect(callArgs.payload.metadata[key]).toBe(value);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * **Feature: notifica-integration, Property 5: Independência entre canais no dispatch**
 *
 * Para qualquer notificação com múltiplos canais habilitados (email, push, in_app),
 * se um canal falhar, os demais canais habilitados ainda devem ser invocados.
 * O número de canais efetivamente chamados deve ser igual ao número de canais habilitados,
 * independentemente de falhas individuais.
 *
 * **Validates: Requirements 2.5**
 */
describe('Property 5: Independência entre canais no dispatch', () => {
  let service: NotificationDispatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@test.com' });
    mockEmailService.sendEmail.mockResolvedValue(undefined);
    mockWebPushService.sendToUser.mockResolvedValue(undefined);
    mockNotificaService.sendNotification.mockResolvedValue({ id: 'n-1' });

    service = new NotificationDispatcherService(
      mockPreferencesService as any,
      mockEmailService as any,
      mockWebPushService as any,
      mockNotificaService as any,
      mockPrisma as any,
    );
    (service as any).logger.error = jest.fn();
  });

  const notificationArbitrary = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    clinicId: fc.uuid(),
    type: fc.constantFrom('general', 'appointment_reminder', 'report_ready'),
    title: fc.string({ minLength: 1 }),
    body: fc.string({ minLength: 1 }),
    metadata: fc.option(
      fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string()),
      { nil: null },
    ),
    readAt: fc.constant(null),
    createdAt: fc.date(),
  });

  const channelConfigArbitrary = fc.record({
    emailEnabled: fc.boolean(),
    pushEnabled: fc.boolean(),
    inAppEnabled: fc.boolean(),
    emailFails: fc.boolean(),
    pushFails: fc.boolean(),
    inAppFails: fc.boolean(),
  });

  it('should invoke each enabled channel regardless of failures in other channels', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArbitrary,
        channelConfigArbitrary,
        async (notification, config) => {
          jest.clearAllMocks();

          // Configure mocks based on failure flags
          if (config.emailFails) {
            mockEmailService.sendEmail.mockRejectedValue(new Error('email failure'));
          } else {
            mockEmailService.sendEmail.mockResolvedValue(undefined);
          }

          if (config.pushFails) {
            mockWebPushService.sendToUser.mockRejectedValue(new Error('push failure'));
          } else {
            mockWebPushService.sendToUser.mockResolvedValue(undefined);
          }

          if (config.inAppFails) {
            mockNotificaService.sendNotification.mockRejectedValue(new Error('in-app failure'));
          } else {
            mockNotificaService.sendNotification.mockResolvedValue({ id: 'n-1' });
          }

          mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@test.com' });

          mockPreferencesService.getOrCreate.mockResolvedValue({
            id: 'pref-1',
            userId: notification.userId,
            clinicId: notification.clinicId,
            emailEnabled: config.emailEnabled,
            pushEnabled: config.pushEnabled,
            inAppEnabled: config.inAppEnabled,
            appointmentRemindersEnabled: true,
            reportNotificationsEnabled: true,
          });

          (service as any).logger.error = jest.fn();

          // dispatch should never throw regardless of channel failures
          await service.dispatch(notification as any);

          // Verify each enabled channel was called
          if (config.emailEnabled) {
            expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
          } else {
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
          }

          if (config.pushEnabled) {
            expect(mockWebPushService.sendToUser).toHaveBeenCalledTimes(1);
          } else {
            expect(mockWebPushService.sendToUser).not.toHaveBeenCalled();
          }

          if (config.inAppEnabled) {
            expect(mockNotificaService.sendNotification).toHaveBeenCalledTimes(1);
          } else {
            expect(mockNotificaService.sendNotification).not.toHaveBeenCalled();
          }

          // Total service calls must equal number of enabled channels
          const expectedCalls =
            (config.emailEnabled ? 1 : 0) +
            (config.pushEnabled ? 1 : 0) +
            (config.inAppEnabled ? 1 : 0);

          const actualCalls =
            mockEmailService.sendEmail.mock.calls.length +
            mockWebPushService.sendToUser.mock.calls.length +
            mockNotificaService.sendNotification.mock.calls.length;

          expect(actualCalls).toBe(expectedCalls);
        },
      ),
      { numRuns: 100 },
    );
  });
});
