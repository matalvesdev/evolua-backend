import * as fc from 'fast-check';
import { NotificaConfigController } from '../notifica-config.controller';
import { AuthUser } from '../../common/decorators/current-user.decorator';

/**
 * **Feature: notifica-integration, Property 8: Corretude do endpoint de configuração**
 *
 * Para qualquer usuário autenticado, o endpoint GET /notifica/config deve retornar um objeto
 * com publishableKey igual à variável de ambiente NOTIFICA_PUBLISHABLE_KEY e subscriberId
 * igual ao User.id do token JWT. A resposta nunca deve conter a chave secreta NOTIFICA_API_KEY.
 *
 * **Validates: Requirements 5.1, 5.2, 5.4, 7.3**
 */
describe('Property 8: Corretude do endpoint de configuração', () => {
  const TEST_PUBLISHABLE_KEY = 'pk_live_test_key_12345';
  const TEST_API_KEY = 'sk_live_secret_api_key_99999';

  const userIdArb = fc.uuid();
  const clinicIdArb = fc.uuid();
  const emailArb = fc.emailAddress();
  const roleArb = fc.constantFrom('admin', 'therapist', 'patient', 'manager');

  const authUserArb = fc.record({
    id: userIdArb,
    email: emailArb,
    clinicId: clinicIdArb,
    role: roleArb,
  }) as fc.Arbitrary<AuthUser>;

  function createController(publishableKey: string) {
    const mockNotificaService = {
      getPublishableKey: jest.fn(() => publishableKey),
    };

    const controller = new NotificaConfigController(mockNotificaService as any);
    return { controller, mockNotificaService };
  }

  it('should return publishableKey equal to NOTIFICA_PUBLISHABLE_KEY and subscriberId equal to user.id', () => {
    fc.assert(
      fc.property(authUserArb, (user) => {
        const { controller } = createController(TEST_PUBLISHABLE_KEY);

        const result = controller.getConfig(user);

        expect(result.publishableKey).toBe(TEST_PUBLISHABLE_KEY);
        expect(result.subscriberId).toBe(user.id);
      }),
      { numRuns: 100 },
    );
  });

  it('should never contain NOTIFICA_API_KEY in the response', () => {
    fc.assert(
      fc.property(authUserArb, (user) => {
        const { controller } = createController(TEST_PUBLISHABLE_KEY);

        const result = controller.getConfig(user);

        // The result object should not have any property with the API key value
        const values = Object.values(result);
        for (const value of values) {
          expect(value).not.toBe(TEST_API_KEY);
        }

        // JSON stringified result should not contain the API key
        const serialized = JSON.stringify(result);
        expect(serialized).not.toContain(TEST_API_KEY);
      }),
      { numRuns: 100 },
    );
  });

  it('should return exactly two properties: publishableKey and subscriberId', () => {
    fc.assert(
      fc.property(authUserArb, (user) => {
        const { controller } = createController(TEST_PUBLISHABLE_KEY);

        const result = controller.getConfig(user);

        const keys = Object.keys(result);
        expect(keys).toHaveLength(2);
        expect(keys).toContain('publishableKey');
        expect(keys).toContain('subscriberId');
      }),
      { numRuns: 100 },
    );
  });
});
