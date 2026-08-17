import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  },
}));

import { NewsletterService } from './newsletter.service.js';

describe('NewsletterService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('upserts a normalized subscription through the service role', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new NewsletterService().subscribe('  FONO@Example.COM  ');

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/newsletter_subscribers?on_conflict=email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'fono@example.com',
          source: 'api-newsletter',
          status: 'active',
          unsubscribed_at: null,
        }),
      }),
    );
  });

  it('cancels a subscription using only the opaque token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const token = 'test-unsubscribe-token';

    const result = await new NewsletterService().unsubscribe(token);

    expect(result).toEqual({ success: true });
    const requestUrl = fetchMock.mock.calls[0]?.[0];
    expect(requestUrl).toContain(`unsubscribe_token=eq.${token}`);
    expect(requestUrl).not.toContain('email');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
