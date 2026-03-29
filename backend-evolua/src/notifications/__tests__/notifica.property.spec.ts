import * as fc from 'fast-check';
import { NotificaService } from '../notifica.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPost = jest.fn();

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      NOTIFICA_API_KEY: 'sk_test_123',
      NOTIFICA_PUBLISHABLE_KEY: 'pk_live_abc',
    };
    return config[key] ?? defaultValue;
  }),
};

/**
 * **Feature: notifica-integration, Property 1: Corretude do payload de subscriber**
 *
 * Para qualquer usuário válido do Evolua (com id, email, fullName, clinicId e opcionalmente phone),
 * o payload gerado pelo NotificaService.upsertSubscriber deve conter:
 * - external_id = User.id
 * - email = User.email
 * - name = User.fullName
 * - locale = "pt-BR"
 * - custom_properties.clinicId = User.clinicId
 * Se phone estiver presente, deve ser incluído; se ausente, não deve estar no payload.
 *
 * **Validates: Requirements 1.1, 1.4, 1.5, 7.1**
 */
describe('Property 1: Corretude do payload de subscriber', () => {
  let service: NotificaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({ post: mockPost } as any);
    mockPost.mockResolvedValue({ data: {} });
    service = new NotificaService(mockConfigService as any);
    (service as any).logger.error = jest.fn();
    (service as any).logger.log = jest.fn();
  });

  const userArbitrary = fc.record({
    externalId: fc.uuid(),
    email: fc.emailAddress(),
    name: fc.string({ minLength: 1 }),
    phone: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
    clinicId: fc.uuid(),
  });

  it('should map all subscriber fields correctly for any valid user', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, async (user) => {
        mockPost.mockClear();
        mockPost.mockResolvedValue({ data: {} });

        await service.upsertSubscriber({
          externalId: user.externalId,
          email: user.email,
          name: user.name,
          phone: user.phone,
          customProperties: { clinicId: user.clinicId },
        });

        expect(mockPost).toHaveBeenCalledTimes(1);
        const payload = mockPost.mock.calls[0][1];

        // external_id = User.id
        expect(payload.external_id).toBe(user.externalId);
        // email = User.email
        expect(payload.email).toBe(user.email);
        // name = User.fullName
        expect(payload.name).toBe(user.name);
        // locale = "pt-BR"
        expect(payload.locale).toBe('pt-BR');
        // custom_properties.clinicId = User.clinicId
        expect(payload.custom_properties).toBeDefined();
        expect(payload.custom_properties.clinicId).toBe(user.clinicId);

        // phone: included when present, omitted when absent
        if (user.phone !== undefined) {
          expect(payload.phone).toBe(user.phone);
        } else {
          expect(payload).not.toHaveProperty('phone');
        }
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * **Feature: notifica-integration, Property 2: Resiliência a falhas da API**
 *
 * Para qualquer chamada ao NotificaService (upsertSubscriber ou sendNotification)
 * que resulte em erro HTTP ou timeout, o método não deve propagar a exceção ao chamador,
 * e a operação principal deve ser concluída com sucesso.
 *
 * - upsertSubscriber deve resolver para undefined (void)
 * - sendNotification deve resolver para null
 *
 * **Validates: Requirements 1.3, 2.4**
 */
describe('Property 2: Resiliência a falhas da API', () => {
  let service: NotificaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({ post: mockPost } as any);
    service = new NotificaService(mockConfigService as any);
    (service as any).logger.error = jest.fn();
    (service as any).logger.log = jest.fn();
  });

  const errorArbitrary = fc.oneof(
    // Timeout errors (ECONNABORTED)
    fc.constant({
      message: 'timeout of 10000ms exceeded',
      code: 'ECONNABORTED',
      isAxiosError: true,
    }),
    // 4xx client errors
    fc.integer({ min: 400, max: 499 }).map((status) => ({
      message: `Request failed with status code ${status}`,
      isAxiosError: true,
      response: { status, data: {} },
    })),
    // 5xx server errors
    fc.integer({ min: 500, max: 599 }).map((status) => ({
      message: `Request failed with status code ${status}`,
      isAxiosError: true,
      response: { status, data: {} },
    })),
  );

  it('upsertSubscriber should not propagate exceptions for any error type', async () => {
    await fc.assert(
      fc.asyncProperty(errorArbitrary, async (error) => {
        mockPost.mockClear();
        mockPost.mockRejectedValue(error);

        const result = await service.upsertSubscriber({
          externalId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          customProperties: { clinicId: 'clinic-456' },
        });

        expect(result).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('sendNotification should not propagate exceptions for any error type', async () => {
    await fc.assert(
      fc.asyncProperty(errorArbitrary, async (error) => {
        mockPost.mockClear();
        mockPost.mockRejectedValue(error);

        const result = await service.sendNotification({
          subscriberId: 'user-123',
          channel: 'in_app',
          payload: {
            title: 'Test',
            body: 'Test body',
          },
        });

        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
