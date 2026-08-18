import { describe, expect, it } from 'vitest';
import {
  effectivePlan,
  FREE_FOR_EVERYONE,
  isActive,
  uiIsPro,
  uiPlan,
  type Entitlement,
} from '@/lib/services/entitlements';

// `isActive` / `effectivePlan` gate paid UI across the app (Header, account,
// Dashboard) and mirror the server-only predicate in functions/entitlements-core.js.
// They are read to gate UI, never to grant — so the branches below are the
// contract the UI relies on.

const NOW = new Date('2026-06-17T00:00:00Z');

describe('isActive', () => {
  it('treats a missing entitlement as inactive', () => {
    expect(isActive(null, NOW)).toBe(false);
    expect(isActive(undefined, NOW)).toBe(false);
  });

  it('treats the free plan as inactive regardless of expiry', () => {
    expect(isActive({ plan: 'free' }, NOW)).toBe(false);
    expect(isActive({ plan: 'free', expiresAt: '2099-01-01' }, NOW)).toBe(false);
  });

  it('treats a paid plan with no expiry as a non-expiring grant', () => {
    // e.g. staff/school grants carry no expiresAt.
    expect(isActive({ plan: 'school', source: 'school' }, NOW)).toBe(true);
    expect(isActive({ plan: 'pro', source: 'staff' }, NOW)).toBe(true);
  });

  it('is active while a paid plan has not yet expired', () => {
    expect(isActive({ plan: 'pro', expiresAt: '2026-12-31T00:00:00Z' }, NOW)).toBe(true);
  });

  it('is inactive once a paid plan has lapsed', () => {
    expect(isActive({ plan: 'pro', expiresAt: '2026-01-01T00:00:00Z' }, NOW)).toBe(false);
  });

  it('is inactive at the exact expiry instant (expiry is exclusive)', () => {
    expect(isActive({ plan: 'pro', expiresAt: NOW.toISOString() }, NOW)).toBe(false);
  });

  it('is inactive when expiresAt is unparseable', () => {
    expect(isActive({ plan: 'pro', expiresAt: 'not-a-date' }, NOW)).toBe(false);
  });

  it('defaults `now` to the current time', () => {
    expect(isActive({ plan: 'pro', expiresAt: '2099-01-01T00:00:00Z' })).toBe(true);
    expect(isActive({ plan: 'pro', expiresAt: '2000-01-01T00:00:00Z' })).toBe(false);
  });
});

describe('effectivePlan', () => {
  it('reports the granted plan while active', () => {
    expect(effectivePlan({ plan: 'pro', expiresAt: '2026-12-31T00:00:00Z' }, NOW)).toBe('pro');
    expect(effectivePlan({ plan: 'school', source: 'school' }, NOW)).toBe('school');
  });

  it('falls back to free for missing, free, or lapsed entitlements', () => {
    expect(effectivePlan(null, NOW)).toBe('free');
    expect(effectivePlan({ plan: 'free' }, NOW)).toBe('free');
    const lapsed: Entitlement = { plan: 'pro', expiresAt: '2026-01-01T00:00:00Z' };
    expect(effectivePlan(lapsed, NOW)).toBe('free');
  });
});

// `uiPlan` / `uiIsPro` are the PRESENTATIONAL reads the UI gates on. While the
// FREE_FOR_EVERYONE promo is on they treat every visitor as Pro (all paywalls open);
// with it off they mirror `effectivePlan` exactly. The pure predicates above stay
// truthful either way (the chat quota UI and the server mirror rely on them).
describe('uiPlan / uiIsPro (presentational promo)', () => {
  const lapsed: Entitlement = { plan: 'pro', expiresAt: '2026-01-01T00:00:00Z' };

  it('presents missing/free/lapsed visitors as Pro while the promo is on', () => {
    const expected = FREE_FOR_EVERYONE ? 'pro' : 'free';
    expect(uiPlan(null, NOW)).toBe(expected);
    expect(uiPlan({ plan: 'free' }, NOW)).toBe(expected);
    expect(uiPlan(lapsed, NOW)).toBe(expected);
    expect(uiIsPro(null, NOW)).toBe(FREE_FOR_EVERYONE);
    expect(uiIsPro({ plan: 'free' }, NOW)).toBe(FREE_FOR_EVERYONE);
  });

  it('never downgrades a genuinely active higher tier', () => {
    // school stays school even under the promo; an active pro stays pro.
    expect(uiPlan({ plan: 'school', source: 'school' }, NOW)).toBe('school');
    expect(uiPlan({ plan: 'pro', expiresAt: '2026-12-31T00:00:00Z' }, NOW)).toBe('pro');
    expect(uiIsPro({ plan: 'school', source: 'school' }, NOW)).toBe(true);
  });
});
