/**
 * Client trigger for the `POST /api/grants/staff` route. On sign-in the app asks
 * the server to grant the complimentary staff entitlement when the user's VERIFIED
 * email is on the allowlist, so any future `@flygaca.com` account unlocks itself
 * without a manual grant. The server re-checks everything (email verified +
 * allowlist) — the pre-check below is only to avoid calling the route for the
 * overwhelming majority of users who aren't staff. Inert in the local-first build.
 */
import { isBackendConfigured, apiTry } from '@/lib/services/backend';

// Mirror of server/src/staff-core.ts — NOT a security boundary (the route
// re-verifies server-side), just a cheap client-side filter. Keep in sync.
const STAFF_EMAILS = ['ay2m@hotmail.com'];
const STAFF_DOMAINS = ['flygaca.com'];

function looksLikeStaff(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0) return false;
  if (STAFF_EMAILS.includes(e)) return true;
  return STAFF_DOMAINS.includes(e.slice(at + 1));
}

/**
 * If the signed-in user's verified email is on the staff allowlist, ask the server
 * to grant the staff entitlement. Best-effort and idempotent; resolves `true` when a
 * grant was (re)confirmed so the caller can re-hydrate the entitlement. No-ops
 * (resolves `false`) for non-staff, an unverified email, a local-only build, or when
 * the API isn't reachable.
 */
export async function claimStaffAccessIfEligible(
  email: string | null | undefined,
  emailVerified: boolean,
): Promise<boolean> {
  if (!emailVerified || !looksLikeStaff(email) || !isBackendConfigured()) return false;
  const res = await apiTry<{ granted?: boolean }>('/grants/staff', { method: 'POST' }, {});
  return res.granted === true;
}
