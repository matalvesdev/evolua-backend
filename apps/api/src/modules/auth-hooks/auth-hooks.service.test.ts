import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { authHooksService } from './auth-hooks.service.js';

describe('auth hooks signature verification', () => {
  it('accepts the HMAC of the exact raw payload only', () => {
    const payload = '{"event":"user.login"}';
    const signature = createHmac('sha256', 'test-auth-hook-signing-secret')
      .update(payload)
      .digest('hex');

    expect(authHooksService.verifySignature(payload, `sha256=${signature}`)).toBe(true);
    expect(authHooksService.verifySignature(`${payload} `, `sha256=${signature}`)).toBe(false);
  });
});
