/**
 * Client trigger for the staff grant (src/lib/services/staff.ts). The pre-check
 * `looksLikeStaff` is NOT a security boundary — POST /api/grants/staff re-verifies
 * the verified-email + allowlist server-side — but it must stay in sync with
 * server/src/staff-core.ts, so this pins the matching rules and the never-throws,
 * only-call-for-eligible-users contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetBackend } from './helpers/mockBackend';

const h = vi.hoisted(() => ({
  configured: true,
  responses: {} as Record<string, unknown>,
  error: null as Error | null,
  calls: [] as Array<{ path: string; method: string; body?: unknown }>,
  events: [] as Array<{ name: string; params?: Record<string, unknown> }>,
}));

vi.mock('@/lib/services/backend', async () => {
  const { makeBackendModule } = await import('./helpers/mockBackend');
  return makeBackendModule(h);
});

import { claimStaffAccessIfEligible } from '@/lib/services/staff';

beforeEach(() => resetBackend(h));

describe('claimStaffAccessIfEligible — client pre-check gates the call', () => {
  it('no-ops (false) for a non-staff email without hitting the API', async () => {
    await expect(claimStaffAccessIfEligible('student@gmail.com', true)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('no-ops (false) when the email is not verified', async () => {
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', false)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('no-ops (false) for a null email', async () => {
    await expect(claimStaffAccessIfEligible(null, true)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('matches the flygaca.com domain (case-insensitively) and calls the grant route', async () => {
    h.responses['/grants/staff'] = { granted: true };
    await expect(claimStaffAccessIfEligible('Pilot@FlyGACA.com', true)).resolves.toBe(true);
    expect(h.calls).toEqual([{ path: '/grants/staff', method: 'POST', body: undefined }]);
  });

  it('matches an explicitly allowlisted address', async () => {
    h.responses['/grants/staff'] = { granted: true };
    await expect(claimStaffAccessIfEligible('ay2m@hotmail.com', true)).resolves.toBe(true);
    expect(h.calls).toHaveLength(1);
  });

  it('does not match a lookalike domain (suffix only)', async () => {
    await expect(claimStaffAccessIfEligible('a@notflygaca.com', true)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('does not match a malformed address with no local part', async () => {
    await expect(claimStaffAccessIfEligible('@flygaca.com', true)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });
});

describe('claimStaffAccessIfEligible — server / transport outcomes', () => {
  it('no-ops (false) in the local-first build (no API configured)', async () => {
    h.configured = false;
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });

  it('swallows a transport failure and resolves false', async () => {
    h.error = new Error('offline');
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });

  it('resolves false when the server declines to grant', async () => {
    h.responses['/grants/staff'] = { granted: false };
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });

  it('resolves false when the response omits a granted flag', async () => {
    h.responses['/grants/staff'] = {};
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });
});
