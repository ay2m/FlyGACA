/**
 * Exam-prep pack access — the promo-immune gate for the paid product line.
 *
 * A paid pack unlocks when the user OWNS it (a one-time purchase recorded server-side
 * in `packEntitlements/{uid}`) OR holds an active paid plan (Pro/School, or the Exam
 * Season Pass, which grants plan `pro`). Ownership is permanent and survives a plan
 * lapse.
 *
 * Deliberately built on the PURE `isActive` predicate — never `uiPlan`/`uiIsPro`/
 * `useFeature` — so the app-wide `FREE_FOR_EVERYONE` promo cannot silently open a
 * paid pack. This mirrors how the chat surface gates on the pure `hasFeature`.
 */
import { isActive, type Entitlement } from '@/lib/services/entitlements';
import { PACKS_GATED, type Pack } from '@/lib/prepCatalog';
import { FLAVOR_GRANTED_PACK_IDS } from '@/flavors/current';

/**
 * Whether the user may use `pack`. Free packs (and everything when the gate is off)
 * are always open; a paid pack needs ownership or an active plan — or it is the
 * pack a standalone flavor app was bought as (paid-upfront: owning the app IS
 * owning the pack, so `FLAVOR_GRANTED_PACK_IDS` carries it). That list is the
 * constant `[]` on every main build, so the web paywall — including its promo
 * immunity — is untouched.
 */
export function hasPackAccess(
  pack: Pack,
  ent: Entitlement | null | undefined,
  ownedPackIds: readonly string[],
  now?: Date,
): boolean {
  if (!PACKS_GATED || pack.access === 'free') return true;
  return (
    FLAVOR_GRANTED_PACK_IDS.includes(pack.id) ||
    ownedPackIds.includes(pack.id) ||
    isActive(ent, now)
  );
}

/**
 * Whether a paid pack is unlocked specifically because the user BOUGHT it (as opposed
 * to it being included with an active plan). Drives the "Owned ✓" vs "Included in Pro"
 * badge on the storefront.
 */
export function ownsPack(pack: Pack, ownedPackIds: readonly string[]): boolean {
  return ownedPackIds.includes(pack.id);
}
