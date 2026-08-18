/**
 * The HTTP I/O helpers in sync.ts (loadAccount + the write-throughs). The pure
 * mappers are covered in sync.test.ts; here the API is mocked to exercise the
 * read/shape/write paths that decide what the client persists — including the
 * load-bearing invariant that a profile write NEVER carries the server-only
 * `entitlement`, and that every write is best-effort (a failure is swallowed so
 * the local-first store stays authoritative).
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Profile, Flight, PilotRecord } from '@/lib/services/account';
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

import {
  loadAccount,
  saveProfileDoc,
  addFlightDoc,
  updateFlightDoc,
  deleteFlightDoc,
  addRecordDoc,
  deleteRecordDoc,
} from '@/lib/services/sync';

const profile: Profile = {
  email: 'pilot@example.com',
  displayName: 'Sara',
  homeBase: 'OERK',
  licenceType: 'PPL',
  medicalExpiry: '2027-01-01',
  lastFlightReview: '2026-01-01',
  role: 'pilot',
};

const flight: Flight = {
  id: 'f1',
  date: '2026-06-01',
  type: 'C172',
  reg: 'HZ-ABC',
  from: 'OERK',
  to: 'OEDF',
  total: '1.5',
  pic: '1.5',
  night: '0',
  ifr: '0',
  ldg: '1',
  nightLdg: '0',
  appr: '0',
  remarks: 'nav',
};

const record: PilotRecord = {
  id: 'r1',
  category: 'rating',
  title: 'Instrument Rating',
  ref: 'IR-2024',
  issued: '2024-01-01',
  expires: '2026-01-01',
  remarks: '',
};

beforeEach(() => resetBackend(h));

describe('loadAccount', () => {
  it('returns null in the local-first build (no backend configured)', async () => {
    h.configured = false;
    expect(await loadAccount()).toBeNull();
    expect(h.calls).toHaveLength(0);
  });

  it('returns null when the request fails rather than throwing', async () => {
    h.error = new Error('offline');
    expect(await loadAccount()).toBeNull();
  });

  it('maps the account payload into profile, logbook, records and entitlement', async () => {
    h.responses['/account'] = {
      user: {
        email: 'pilot@example.com',
        displayName: 'Sara',
        homeBase: 'OERK',
        entitlement: { plan: 'pro', expiresAt: '2027-01-01T00:00:00.000Z', source: 'moyasar' },
      },
      logbook: [{ id: 'f1', date: '2026-06-01', type: 'C172', reg: 'HZ-ABC' }],
      records: [{ id: 'r1', category: 'rating', title: 'Instrument Rating' }],
      chatCredits: 12,
      ownedPacks: ['medical', 'aip'],
    };

    const acct = await loadAccount();
    expect(acct?.profile).toMatchObject({
      email: 'pilot@example.com',
      displayName: 'Sara',
      homeBase: 'OERK',
    });
    expect(acct?.flights).toHaveLength(1);
    expect(acct?.flights[0]).toMatchObject({ id: 'f1', type: 'C172', reg: 'HZ-ABC' });
    expect(acct?.records?.[0]).toMatchObject({ id: 'r1', title: 'Instrument Rating' });
    expect(acct?.entitlement).toEqual({
      plan: 'pro',
      expiresAt: '2027-01-01T00:00:00.000Z',
      source: 'moyasar',
    });
    expect(acct?.chatCredits).toBe(12);
    expect(acct?.ownedPacks).toEqual(['medical', 'aip']);
  });

  it('floors and clamps a nonsensical credit balance to a non-negative integer', async () => {
    h.responses['/account'] = { chatCredits: -5 };
    expect((await loadAccount())?.chatCredits).toBe(0);

    h.responses['/account'] = { chatCredits: 3.9 };
    expect((await loadAccount())?.chatCredits).toBe(3);

    h.responses['/account'] = {};
    expect((await loadAccount())?.chatCredits).toBe(0);
  });

  it('reports a null entitlement when the server has written none', async () => {
    h.responses['/account'] = { user: {} };
    expect((await loadAccount())?.entitlement).toBeNull();
  });

  it('defaults the collections to empty when the payload omits them', async () => {
    h.responses['/account'] = {};
    const acct = await loadAccount();
    expect(acct?.flights).toEqual([]);
    expect(acct?.records).toEqual([]);
    expect(acct?.ownedPacks).toEqual([]);
  });
});

describe('write-throughs', () => {
  it('no-op silently in the local-first build', async () => {
    h.configured = false;
    await expect(saveProfileDoc(profile)).resolves.toBeUndefined();
    await expect(addFlightDoc(flight)).resolves.toBeUndefined();
    await expect(deleteFlightDoc('f1')).resolves.toBeUndefined();
    expect(h.calls).toHaveLength(0);
  });

  it('swallow a failure so the local store stays authoritative', async () => {
    h.error = new Error('offline');
    await expect(saveProfileDoc(profile)).resolves.toBeUndefined();
    await expect(deleteFlightDoc('f1')).resolves.toBeUndefined();
  });

  it('NEVER send the server-only entitlement on a profile write', async () => {
    await saveProfileDoc({ ...profile, entitlement: { plan: 'pro' } } as unknown as Profile);
    expect(h.calls[0]).toMatchObject({ path: '/account/profile', method: 'PUT' });
    expect(h.calls[0].body).not.toHaveProperty('entitlement');
    expect(h.calls[0].body).toMatchObject({ email: 'pilot@example.com', homeBase: 'OERK' });
  });

  it('POST a new flight with its client-generated id', async () => {
    await addFlightDoc(flight);
    expect(h.calls[0]).toMatchObject({ path: '/account/logbook', method: 'POST' });
    expect(h.calls[0].body).toMatchObject({ id: 'f1', reg: 'HZ-ABC', nightLdg: '0' });
  });

  it('PATCH an existing flight by id', async () => {
    await updateFlightDoc('f1', flight);
    expect(h.calls[0]).toMatchObject({ path: '/account/logbook/f1', method: 'PATCH' });
  });

  it('DELETE a flight by id', async () => {
    await deleteFlightDoc('f1');
    expect(h.calls[0]).toEqual({ path: '/account/logbook/f1', method: 'DELETE', body: undefined });
  });

  it('POST and DELETE pilot records on their own path', async () => {
    await addRecordDoc(record);
    expect(h.calls[0]).toMatchObject({ path: '/account/records', method: 'POST' });
    expect(h.calls[0].body).toMatchObject({ id: 'r1', title: 'Instrument Rating' });

    await deleteRecordDoc('r1');
    expect(h.calls[1]).toEqual({
      path: '/account/records/r1',
      method: 'DELETE',
      body: undefined,
    });
  });

  it('percent-encode an id with URL-unsafe characters', async () => {
    await deleteFlightDoc('a/b');
    expect(h.calls[0].path).toBe('/account/logbook/a%2Fb');
  });
});
