/**
 * Founding-access policy — a time-limited complimentary Pro grant that grandfathers
 * accounts which existed BEFORE the paid launch, so turning monetization on doesn't
 * lock out early adopters. Pure (no Firebase/Express imports) so it is unit-testable,
 * mirroring the staff-core / billing-core pattern.
 *
 * Eligibility is the account's Firebase Auth creation time predating a fixed cutoff —
 * a signal only the server can read (Admin `getUser().metadata.creationTime`), so it
 * cannot be spoofed from the client. The grant is one-time and upgrade-only.
 */
import { effectivePlan, type Entitlement, type Plan } from "./billing-core.js";

/** Accounts created strictly before this instant are eligible (the launch cutoff). */
export const FOUNDING_CUTOFF_ISO = "2026-08-01T00:00:00.000Z";

/** Days of complimentary Pro a founding grant confers. */
export const FOUNDING_GRANT_DAYS = 180;

/**
 * Whether an account (by its Firebase Auth creation time, ms epoch) predates the
 * launch cutoff and so qualifies for the founding grant.
 */
export function isFoundingEligible(
  creationTimeMs: number | null | undefined,
  cutoffIso: string = FOUNDING_CUTOFF_ISO,
): boolean {
  if (!creationTimeMs || !Number.isFinite(creationTimeMs)) return false;
  const cutoff = Date.parse(cutoffIso);
  return Number.isFinite(cutoff) && creationTimeMs < cutoff;
}

/**
 * The entitlement a founding grant confers: `days` of Pro from `now`, tagged
 * `source: "founding"`. Given the member's `current` entitlement it never SHORTENS a
 * later paid expiry and preserves an active higher (`school`) tier — so the comp can
 * never downgrade a paying/staff/school user (upgrade-only, like `entitlementFromPass`).
 */
export function foundingEntitlement(
  now: Date,
  current?: Entitlement | null,
  days: number = FOUNDING_GRANT_DAYS,
): Entitlement {
  const grantExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const activeNow = effectivePlan(current, now);
  const currentExpiry =
    activeNow !== "free" && current?.expiresAt ? new Date(current.expiresAt) : null;
  const expiresAt =
    currentExpiry && currentExpiry.getTime() > grantExpiry.getTime() ? currentExpiry : grantExpiry;
  const plan: Plan = activeNow === "school" ? "school" : "pro";
  return { plan, source: "founding", expiresAt: expiresAt.toISOString() };
}
