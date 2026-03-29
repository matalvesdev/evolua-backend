import * as fc from 'fast-check';
import { EmailService } from '../email.service';
import { NotificaService } from '../notifica.service';

/**
 * **Feature: notifica-integration, Property 7: Resolução de template com fallback**
 *
 * Para qualquer tipo de notificação, se um template_id estiver configurado para esse tipo,
 * o payload enviado à API Notifica deve conter template_id e variables com todas as chaves
 * necessárias. Se nenhum template_id estiver configurado, o payload deve conter conteúdo
 * inline (subject/html_body).
 *
 * **Validates: Requirements 4.1, 4.2, 4.4**
 */
describe('Property 7: Resolução de template com fallback', () => {
  const notificationTypes = ['appointment_reminder', 'report_ready', 'welcome'] as const;

  const expectedVariableKeys: Record<string, string[]> = {
    appointment_reminder: ['name', 'date', 'time'],
    report_ready: ['name', 'reportType'],
    welcome: ['name'],
  };

  const notificationTypeArb = fc.constantFrom(...notificationTypes);
  const hasTemplateArb = fc.boolean();
  const templateIdArb = fc.stringMatching(/^tmpl_[a-z0-9]{4,12}$/);

  const inputDataArb = fc.record({
    email: fc.emailAddress(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    date: fc.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
    time: fc.stringMatching(/^\d{2}:\d{2}$/),
    reportType: fc.string({ minLength: 1, maxLength: 30 }),
  });

  function createMocks(hasTemplate: boolean, templateId: string) {
    const capturedCalls: any[] = [];

    const mockNotificaService = {
      getTemplateId: jest.fn((type: string) => (hasTemplate ? templateId : undefined)),
      sendNotification: jest.fn(async (options: any) => {
        capturedCalls.push(options);
        return { id: 'notif-1', channel: 'email', status: 'sent', recipient: options.subscriberId, created_at: new Date().toISOString() };
      }),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'NOTIFICA_FROM_EMAIL') return 'noreply@useevolua.com';
        return defaultValue;
      }),
    };

    const emailService = new EmailService(mockConfigService as any, mockNotificaService as any);
    (emailService as any).logger = { log: jest.fn(), error: jest.fn() };

    return { emailService, mockNotificaService, capturedCalls };
  }

  async function callMethod(
    emailService: EmailService,
    type: string,
    data: { email: string; name: string; date: string; time: string; reportType: string },
  ) {
    switch (type) {
      case 'appointment_reminder':
        return emailService.sendAppointmentReminder(data.email, data.name, data.date, data.time);
      case 'report_ready':
        return emailService.sendReportReady(data.email, data.name, data.reportType);
      case 'welcome':
        return emailService.sendWelcomeEmail(data.email, data.name);
    }
  }

  it('should use template_id and variables when template is configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationTypeArb,
        templateIdArb,
        inputDataArb,
        async (type, templateId, data) => {
          const { emailService, mockNotificaService, capturedCalls } = createMocks(true, templateId);

          await callMethod(emailService, type, data);

          // getTemplateId must have been called with the correct type
          expect(mockNotificaService.getTemplateId).toHaveBeenCalledWith(type);

          // sendNotification should have been called exactly once with template
          expect(mockNotificaService.sendNotification).toHaveBeenCalledTimes(1);
          const call = capturedCalls[0];

          expect(call.templateId).toBe(templateId);
          expect(call.channel).toBe('email');
          expect(call.variables).toBeDefined();

          // All required variable keys must be present
          const requiredKeys = expectedVariableKeys[type];
          for (const key of requiredKeys) {
            expect(call.variables).toHaveProperty(key);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should use inline content when template is not configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationTypeArb,
        inputDataArb,
        async (type, data) => {
          const { emailService, mockNotificaService, capturedCalls } = createMocks(false, '');

          await callMethod(emailService, type, data);

          // getTemplateId must have been called with the correct type
          expect(mockNotificaService.getTemplateId).toHaveBeenCalledWith(type);

          // sendNotification should have been called exactly once with inline content
          expect(mockNotificaService.sendNotification).toHaveBeenCalledTimes(1);
          const call = capturedCalls[0];

          expect(call.templateId).toBeUndefined();
          expect(call.channel).toBe('email');
          expect(call.payload).toBeDefined();
          expect(call.payload.subject).toBeDefined();
          expect(typeof call.payload.subject).toBe('string');
          expect(call.payload.subject.length).toBeGreaterThan(0);
          expect(call.payload.html_body).toBeDefined();
          expect(typeof call.payload.html_body).toBe('string');
          expect(call.payload.html_body.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
