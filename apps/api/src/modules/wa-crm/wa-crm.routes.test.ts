import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from './wa-crm.routes.js';

describe('wa-crm inbound webhook signature', () => {
  it('accepts only the exact raw JSON bytes signed by the Go gateway', () => {
    const raw = '{"instance":"clinic-a","messageId":"event-1", "text":"olá"}';
    const signature = createHmac('sha256', process.env.EVOLUTION_WEBHOOK_SECRET!)
      .update(raw)
      .digest('hex');

    expect(verifyWebhookSignature(raw, `sha256=${signature}`)).toBe(true);
    expect(
      verifyWebhookSignature('{"instance":"clinic-a","messageId":"event-1","text":"olá"}', `sha256=${signature}`),
    ).toBe(false);
  });

  it('rejects absent and forged signatures', () => {
    expect(verifyWebhookSignature('{"messageId":"event-1"}', undefined)).toBe(false);
    expect(verifyWebhookSignature('{"messageId":"event-1"}', 'sha256=00')).toBe(false);
  });
});
