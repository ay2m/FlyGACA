/**
 * Client trigger for the school-seat grant (src/lib/services/school.ts). Unlike the
 * staff pre-check there is no cheap client filter for the invite path, so the only
 * client-side gates are "verified" and "has an address"; POST /api/grants/school-seat
 * re-checks domain/invite server-side. Best-effort: never throws.
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

import { claimSchoolSeatIfEligible } from '@/lib/services/school';

beforeEach(() => resetBackend(h));

describe('claimSchoolSeatIfEligible', () => {
  it('no-ops (false) when the email is not verified', async () => {
    await expect(claimSchoolSeatIfEligible('a@school.edu', false)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('no-ops (false) for a null email', async () => {
    await expect(claimSchoolSeatIfEligible(null, true)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('no-ops (false) in the local-first build (no API configured)', async () => {
    h.configured = false;
    await expect(claimSchoolSeatIfEligible('a@school.edu', true)).resolves.toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it('calls the grant route for any verified address and reports the grant', async () => {
    h.responses['/grants/school-seat'] = { granted: true };
    await expect(claimSchoolSeatIfEligible('a@school.edu', true)).resolves.toBe(true);
    expect(h.calls).toEqual([{ path: '/grants/school-seat', method: 'POST', body: undefined }]);
  });

  it('resolves false when the server declines to grant', async () => {
    h.responses['/grants/school-seat'] = { granted: false };
    await expect(claimSchoolSeatIfEligible('a@school.edu', true)).resolves.toBe(false);
  });

  it('swallows a transport failure and resolves false', async () => {
    h.error = new Error('offline');
    await expect(claimSchoolSeatIfEligible('a@school.edu', true)).resolves.toBe(false);
  });
});
