/**
 * Feature gating — the single source of truth for which premium features a plan
 * unlocks. The entitlement record is written SERVER-ONLY (Cloud Functions, via the
 * Moyasar billing functions) and read here only to gate UI presentation, never to
 * grant access; true enforcement for gated content/AI stays in the Firebase gateway.
 *
 * `hasFeature` is a pure predicate (mirrors the style of `entitlements.ts`) so it
 * is unit-testable without a backend; `useFeature` is the React-side convenience
 * that reads the live entitlement from the global account store.
 */
import { useAccount } from '@/lib/services/account';
import {
  effectivePlan,
  FREE_FOR_EVERYONE,
  type Entitlement,
  type Plan,
} from '@/lib/services/entitlements';

export type Feature =
  | 'adel-unlimited' // Captain Adel beyond the free daily quota / pro model
  | 'tool-presets' // saving calculator presets
  | 'currency-export' // ICS calendar export of currency expiries
  | 'mock-exam' // full mock exam
  | 'prep-packs' // pro exam-prep packs
  | 'offline-sync' // saving documents / the AIP for offline use
  | 'bookmarks' // library + approach-plate bookmarking
  | 'change-alerts'; // regulatory change-tracking feed

/**
 * Minimum plan each feature requires. Everything premium is currently `pro`,
 * which `school` also satisfies (see RANK). Centralising the map here means a
 * feature can be re-tiered in one place.
 */
export const FEATURE_PLAN: Record<Feature, Plan> = {
  'adel-unlimited': 'pro',
  'tool-presets': 'pro',
  'currency-export': 'pro',
  'mock-exam': 'pro',
  'prep-packs': 'pro',
  'offline-sync': 'pro',
  bookmarks: 'pro',
  'change-alerts': 'pro',
};

/** Plan ordering: a higher rank satisfies any feature gated at a lower one. */
const RANK: Record<Plan, number> = { free: 0, pro: 1, school: 2 };

/** True when the entitlement's effective plan unlocks `feature` at `now`. */
export function hasFeature(
  ent: Entitlement | null | undefined,
  feature: Feature,
  now?: Date,
): boolean {
  return RANK[effectivePlan(ent, now)] >= RANK[FEATURE_PLAN[feature]];
}

/** React hook: does the signed-in user's live entitlement unlock `feature`? */
export function useFeature(feature: Feature): boolean {
  const { entitlement } = useAccount();
  // The FREE_FOR_EVERYONE promo opens every gated feature in the UI. `hasFeature`
  // itself stays pure so the chat gate (which reads it directly) remains honest.
  return FREE_FOR_EVERYONE || hasFeature(entitlement, feature);
}
