/**
 * Referral client helpers: normalize a code, capture an inbound `?ref=` into
 * localStorage, carry it into a shareable pricing link, and fetch the signed-in
 * user's own code from the gateway. A regression here silently drops referral
 * attribution, so the transport is worth pinning. The server validates + grants;
 * this module only moves the token.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import {
  normalizeRef,
  captureRefFromUrl,
  getStoredRef,
  referralLink,
  fetchReferralCode,
} from '@/lib/services/referral';

const REF_KEY = 'flygaca:ref';
const origHref = window.location.href;

beforeEach(() => {
  resetBackend(h);
  localStorage.clear();
});

afterEach(() => {
  window.history.replaceState({}, '', origHref);
});

describe('normalizeRef', () => {
  it('upper-cases, strips non-alphanumerics and caps at 8 chars', () => {
    expect(normalizeRef('fly-123')).toBe('FLY123');
    expect(normalizeRef('a1b2c3d4e5f6')).toBe('A1B2C3D4');
    expect(normalizeRef('  hi!there  ')).toBe('HITHERE');
  });

  it('returns empty string for nullish or empty input', () => {
    expect(normalizeRef(null)).toBe('');
    expect(normalizeRef(undefined)).toBe('');
    expect(normalizeRef('')).toBe('');
  });
});

describe('captureRefFromUrl / getStoredRef', () => {
  it('captures and normalizes a ?ref= from the URL into localStorage', () => {
    window.history.replaceState({}, '', '/pricing?ref=fly-123');
    captureRefFromUrl();
    expect(localStorage.getItem(REF_KEY)).toBe('FLY123');
    expect(getStoredRef()).toBe('FLY123');
  });

  it('stores nothing when there is no ref param', () => {
    window.history.replaceState({}, '', '/pricing');
    captureRefFromUrl();
    expect(localStorage.getItem(REF_KEY)).toBeNull();
    expect(getStoredRef()).toBeUndefined();
  });
});

describe('referralLink', () => {
  it('builds a shareable pricing link carrying the code', () => {
    expect(referralLink('ABC123')).toBe(`${window.location.origin}/pricing?ref=ABC123`);
  });
});

describe('fetchReferralCode', () => {
  it('returns null in the local-first build (no call attempted)', async () => {
    h.configured = false;
    expect(await fetchReferralCode()).toBeNull();
    expect(h.calls).toHaveLength(0);
  });

  it('GETs /billing/referral-code and returns the code on success', async () => {
    h.responses['/billing/referral-code'] = { code: 'FLY123' };
    expect(await fetchReferralCode()).toBe('FLY123');
    expect(h.calls).toEqual([{ path: '/billing/referral-code', method: 'GET', body: undefined }]);
  });

  it('returns null when the server responds without a code', async () => {
    h.responses['/billing/referral-code'] = {};
    expect(await fetchReferralCode()).toBeNull();
  });

  it('swallows a transport error and returns null (the card just hides)', async () => {
    h.error = new Error('offline');
    expect(await fetchReferralCode()).toBeNull();
  });
});
