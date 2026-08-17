import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { OnboardingService } = await import('./onboarding.service.js');

afterEach(() => vi.clearAllMocks());

describe('OnboardingService persistence contract', () => {
  it('uses the atomic RPC instead of a zero-row PATCH', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    const result = await new OnboardingService().completeStep(
      '5df12004-91bd-4d52-b559-3a4419e9ca1d',
      'profile',
      { clinicName: 'Clínica teste' },
    );

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/rpc/advance_onboarding_progress'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          p_user_id: '5df12004-91bd-4d52-b559-3a4419e9ca1d',
          p_step_id: 'profile',
          p_data: { clinicName: 'Clínica teste' },
          p_completed: false,
        }),
      }),
    );
  });

  it('does not report success when the persistence request fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(
      new OnboardingService().complete('5df12004-91bd-4d52-b559-3a4419e9ca1d'),
    ).resolves.toEqual({ success: false });
  });
});
