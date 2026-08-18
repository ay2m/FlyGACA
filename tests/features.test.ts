import { describe, expect, it } from 'vitest';
import { FEATURE_PLAN, hasFeature, type Feature } from '@/lib/services/features';
import type { Entitlement } from '@/lib/services/entitlements';

// `hasFeature` is the single gate the UI reads to decide whether to show a
// premium feature or its upsell. Like `effectivePlan`, it never grants access —
// the server is the source of truth — so these branches are the UI contract.

const NOW = new Date('2026-06-17T00:00:00Z');
const FEATURES = Object.keys(FEATURE_PLAN) as Feature[];
const ACTIVE_PRO: Entitlement = { plan: 'pro', expiresAt: '2026-12-31T00:00:00Z' };
const SCHOOL: Entitlement = { plan: 'school', source: 'school' };
const LAPSED: Entitlement = { plan: 'pro', expiresAt: '2026-01-01T00:00:00Z' };

describe('hasFeature', () => {
  it('locks every premium feature for free / missing / lapsed entitlements', () => {
    for (const f of FEATURES) {
      expect(hasFeature(null, f, NOW)).toBe(false);
      expect(hasFeature({ plan: 'free' }, f, NOW)).toBe(false);
      expect(hasFeature(LAPSED, f, NOW)).toBe(false);
    }
  });

  it('unlocks every premium feature for an active pro plan', () => {
    for (const f of FEATURES) {
      expect(hasFeature(ACTIVE_PRO, f, NOW)).toBe(true);
    }
  });

  it('unlocks every pro feature for school (higher tier satisfies pro)', () => {
    for (const f of FEATURES) {
      expect(hasFeature(SCHOOL, f, NOW)).toBe(true);
    }
  });

  it('every feature maps to a known plan', () => {
    for (const f of FEATURES) {
      expect(['free', 'pro', 'school']).toContain(FEATURE_PLAN[f]);
    }
  });
});
