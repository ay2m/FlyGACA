/**
 * Client trigger for the founding grandfather grant (src/lib/services/founding.ts).
 * Eligibility (account created before the launch cutoff) is decided SERVER-SIDE from
 * the stored creation time, so the client gate is only "verified + configured" and
 * the call is made for any still-free verified user. Best-effort: never throws.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetBackend } from './helpers/mockBackend';
import type { BackendState } from './helpers/mockBackend';

const h = vi.hoisted((): BackendState => ({
  configured: true,
  responses: {},
  error: null,
  calls: [],
  events: [],
}));

vi.mock('@/lib/services/backend', async () => {
  const { makeBackendModule } = await import('./helpers/mockBackend');
  return makeBackendModule(h);
});

import { claimFoundingAccessIfEligible } from '@/lib/services/founding';

beforeEach(() => resetBackend(h));

describe('claimFoundingAccessIfEligible', () => {
  it('no-ops (false) when the email is not verified', async () => {
    await expect(claimFoundingAccessIfEligible(false)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('no-ops (false) in the local-first build (no API configured)', async () => {
    h.configured = false;
    await expect(claimFoundingAccessIfEligible(true)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('calls the grant route and reports a grant', async () => {
    h.responses['/grants/founding'] = { granted: true };
    await expect(claimFoundingAccessIfEligible(true)).resolves.toBe(true);
    expect(h.calls).toEqual([{ path: '/grants/founding', method: 'POST', body: undefined }]);
  });

  it('resolves false when the server declines (ineligible or already entitled)', async () => {
    h.responses['/grants/founding'] = { granted: false, already: true };
    await expect(claimFoundingAccessIfEligible(true)).resolves.toBe(false);
  });

  it('swallows a transport failure and resolves false', async () => {
    h.error = new Error('offline');
    await expect(claimFoundingAccessIfEligible(true)).resolves.toBe(false);
  });
});
