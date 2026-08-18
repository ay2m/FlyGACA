/**
 * Staff access policy — the single source of truth for which accounts get a
 * complimentary full-access ("staff") entitlement. Pure (no Firebase/Express
 * imports) so it is unit-testable and can be mirrored by the one-off grant script
 * and the client pre-check.
 *
 * Security: a domain match is honoured ONLY for a VERIFIED email. Without that
 * guard anyone could register `anything@flygaca.com` they don't control and
 * self-grant access — email verification (link, or Google Workspace SSO) is the
 * ownership proof. The specific personal address is treated the same way.
 */
import type { Entitlement } from "./billing-core.js";

/** Exact addresses granted staff access (compared case-insensitively). */
export const STAFF_EMAILS: readonly string[] = ["ay2m@hotmail.com"];

/** Email domains whose verified addresses are granted staff access. */
export const STAFF_DOMAINS: readonly string[] = ["flygaca.com"];

/**
 * Whether `email` is on the staff allowlist. Requires `emailVerified` — an
 * unverified address never qualifies, so a domain match can't be spoofed by
 * signing up as someone you aren't.
 */
export function isStaffEmail(
  email: string | null | undefined,
  emailVerified: boolean | undefined,
): boolean {
  if (!emailVerified || !email) return false;
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return false;
  if (STAFF_EMAILS.includes(e)) return true;
  return STAFF_DOMAINS.includes(e.slice(at + 1));
}

/**
 * The entitlement a staff member receives: the top `school` tier (Pro plus any
 * org-admin surfaces) with no expiry, tagged `source: "staff"` so it is
 * distinguishable from a Moyasar grant and can be revoked deliberately.
 */
export function staffEntitlement(): Entitlement {
  return { plan: "school", source: "staff" };
}
