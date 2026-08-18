/**
 * Client for the B2B org-admin routes (src/lib/services/org.ts). Every call is
 * best-effort: the page must be able to render a "no access" state rather than
 * throw, so a missing backend, an offline request and a 403 all resolve to the
 * safe empty value.
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

import { getMyOrgs, getCohortReadiness, provisionSeats } from '@/lib/services/org';

beforeEach(() => resetBackend(h));

describe('when no backend is configured (local-first build)', () => {
  beforeEach(() => {
    h.configured = false;
  });

  it('getMyOrgs resolves to an empty list', async () => {
    await expect(getMyOrgs()).resolves.toEqual([]);
  });

  it('getCohortReadiness resolves to null', async () => {
    await expect(getCohortReadiness('acme')).resolves.toBeNull();
  });

  it('provisionSeats resolves to null', async () => {
    await expect(provisionSeats('acme', ['a@b.com'])).resolves.toBeNull();
  });
});

describe('when a call fails (offline / not authorised)', () => {
  beforeEach(() => {
    h.error = new Error('not-authorised');
  });

  it('getMyOrgs swallows the error and returns []', async () => {
    await expect(getMyOrgs()).resolves.toEqual([]);
  });

  it('getCohortReadiness swallows the error and returns null', async () => {
    await expect(getCohortReadiness('acme')).resolves.toBeNull();
  });
});

describe('request shaping and response passthrough', () => {
  it('getMyOrgs unwraps the { orgs } envelope', async () => {
    const orgs = [{ id: 'acme', name: 'Acme', seatLimit: 10, seatsUsed: 3 }];
    h.responses['/org/mine'] = { orgs };
    await expect(getMyOrgs()).resolves.toEqual(orgs);
    expect(h.calls).toEqual([{ path: '/org/mine', method: 'GET', body: undefined }]);
  });

  it('getMyOrgs returns [] when the envelope has no orgs', async () => {
    h.responses['/org/mine'] = {};
    await expect(getMyOrgs()).resolves.toEqual([]);
  });

  it('getCohortReadiness addresses the org by path and returns the readiness payload', async () => {
    const readiness = {
      orgId: 'acme',
      name: 'Acme',
      threshold: 75,
      banks: ['aip-ais'],
      counts: { total: 1, active: 1, ready: 0 },
      rows: [],
    };
    h.responses['/org/acme/cohort-readiness'] = readiness;
    await expect(getCohortReadiness('acme')).resolves.toEqual(readiness);
    expect(h.calls[0].path).toBe('/org/acme/cohort-readiness');
  });

  it('percent-encodes an org id with URL-unsafe characters', async () => {
    await getCohortReadiness('a/b');
    expect(h.calls[0].path).toBe('/org/a%2Fb/cohort-readiness');
  });

  it('provisionSeats posts emails and expiresAt, with the org in the path', async () => {
    h.responses['/org/acme/provision-seats'] = {
      results: [{ email: 'a@b.com', success: true }],
    };
    const res = await provisionSeats('acme', ['a@b.com'], '2027-01-01');
    expect(res).toEqual({ results: [{ email: 'a@b.com', success: true }] });
    expect(h.calls).toEqual([
      {
        path: '/org/acme/provision-seats',
        method: 'POST',
        body: { emails: ['a@b.com'], expiresAt: '2027-01-01' },
      },
    ]);
  });
});
