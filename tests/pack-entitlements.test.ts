import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasPackAccess, ownsPack } from '@/lib/services/packEntitlements';
import { type Entitlement } from '@/lib/services/entitlements';
import { PACKS_GATED, type Pack } from '@/lib/prepCatalog';

// hasPackAccess is the paywall for the exam-prep product line. Its contract:
// free packs (and everything when the gate is off) are open; a paid pack unlocks
// only when OWNED or when a paid plan is active. Crucially it is PROMO-IMMUNE — it
// must NOT open a paid pack just because FREE_FOR_EVERYONE is on (that promo only
// affects the presentational uiPlan/useFeature reads, never pack ownership).

const NOW = new Date('2026-07-19T00:00:00Z');

const paidPack: Pack = {
  id: 'medical',
  kind: 'subject',
  status: 'live',
  access: 'paid',
  bankIds: ['medical'],
};
const freePack: Pack = {
  id: 'airspace-vfr',
  kind: 'subject',
  status: 'live',
  access: 'free',
  bankIds: ['airspace'],
};

const activePro: Entitlement = { plan: 'pro', expiresAt: '2026-12-31T00:00:00Z', source: 'moyasar' };
const lapsedPro: Entitlement = { plan: 'pro', expiresAt: '2026-01-01T00:00:00Z', source: 'moyasar' };
const school: Entitlement = { plan: 'school', source: 'school' };

describe('hasPackAccess', () => {
  it('opens a free pack for everyone (even anonymous)', () => {
    expect(hasPackAccess(freePack, null, [], NOW)).toBe(true);
    expect(hasPackAccess(freePack, { plan: 'free' }, [], NOW)).toBe(true);
  });

  it('locks a paid pack for a free/anonymous user who does not own it', () => {
    expect(hasPackAccess(paidPack, null, [], NOW)).toBe(false);
    expect(hasPackAccess(paidPack, { plan: 'free' }, [], NOW)).toBe(false);
  });

  it('is PROMO-IMMUNE — pack access never consults FREE_FOR_EVERYONE', () => {
    // hasPackAccess is built on the pure isActive predicate, never uiPlan/useFeature,
    // so a free-plan user is locked out of a paid pack whether the promo is on or off.
    expect(hasPackAccess(paidPack, { plan: 'free' }, [], NOW)).toBe(false);
    expect(hasPackAccess(paidPack, null, [], NOW)).toBe(false);
  });

  it('unlocks a paid pack the user owns (permanent, plan-independent)', () => {
    expect(hasPackAccess(paidPack, null, ['medical'], NOW)).toBe(true);
    expect(hasPackAccess(paidPack, { plan: 'free' }, ['medical'], NOW)).toBe(true);
    // Ownership survives a lapsed plan.
    expect(hasPackAccess(paidPack, lapsedPro, ['medical'], NOW)).toBe(true);
  });

  it('includes a paid pack with any active paid plan (Pro/School)', () => {
    expect(hasPackAccess(paidPack, activePro, [], NOW)).toBe(true);
    expect(hasPackAccess(paidPack, school, [], NOW)).toBe(true);
  });

  it('locks a paid pack once the plan lapses and it is not owned', () => {
    expect(hasPackAccess(paidPack, lapsedPro, [], NOW)).toBe(false);
  });

  it('respects the PACKS_GATED kill-switch', () => {
    // Documents current behaviour: with the gate ON, a paid unowned pack is locked.
    expect(PACKS_GATED).toBe(true);
    expect(hasPackAccess(paidPack, { plan: 'free' }, [], NOW)).toBe(false);
  });
});

describe('flavor grant (standalone prep-app builds)', () => {
  // A flavor app is paid upfront: owning the app IS owning its pack. The grant
  // rides in FLAVOR_GRANTED_PACK_IDS (compiled from VITE_APP_FLAVOR), so the
  // suite above — which runs with the env unset — doubles as proof that main
  // builds keep an empty grant list and identical paywall semantics.
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('unlocks exactly the flavor’s own pack, nothing else', async () => {
    vi.stubEnv('VITE_APP_FLAVOR', 'medical');
    vi.resetModules();
    const fresh = await import('@/lib/services/packEntitlements');
    // Its own pack: open with no account, no entitlement, no ownership.
    expect(fresh.hasPackAccess(paidPack, null, [], NOW)).toBe(true);
    // A different paid pack stays locked — the grant is not a skeleton key.
    const otherPaid: Pack = { ...paidPack, id: 'aip' };
    expect(fresh.hasPackAccess(otherPaid, null, [], NOW)).toBe(false);
    // And the grant is access, not purchase — "Owned" badges still need a buy.
    expect(fresh.ownsPack(paidPack, [])).toBe(false);
  });
});

describe('ownsPack', () => {
  it('is true only when the pack id is in the owned set', () => {
    expect(ownsPack(paidPack, ['medical'])).toBe(true);
    expect(ownsPack(paidPack, ['aip'])).toBe(false);
    expect(ownsPack(paidPack, [])).toBe(false);
  });

  it('distinguishes ownership from plan-included access', () => {
    // A Pro user who never bought this pack has access but does NOT "own" it —
    // drives the "Included in Pro" vs "Owned" badge.
    expect(hasPackAccess(paidPack, activePro, [], NOW)).toBe(true);
    expect(ownsPack(paidPack, [])).toBe(false);
  });
});
