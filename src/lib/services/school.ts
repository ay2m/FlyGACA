/**
 * Client trigger for the `POST /api/grants/school-seat` route. On sign-in — when the
 * user has no active paid plan — the app asks the server to grant a school seat if
 * their VERIFIED email is on an approved school domain or the invite roster, so an
 * invited member unlocks without waiting for a roster script to be re-run. The server
 * re-checks everything (email verified + domain/invite); this is best-effort. Inert in
 * the local-first build. Unlike the staff pre-check there is no cheap client filter for
 * the invite path, so the *caller* gates this on a free plan (see account.ts) to avoid
 * calling it for paying/already-granted users.
 */
import { isBackendConfigured, apiTry } from '@/lib/services/backend';

/**
 * Ask the server to grant a school seat for the signed-in user. Best-effort and
 * idempotent; resolves `true` when a grant was (re)confirmed so the caller can
 * re-hydrate the entitlement. No-ops (resolves `false`) for an unverified email, a
 * local-only build, or when the API isn't reachable.
 */
export async function claimSchoolSeatIfEligible(
  email: string | null | undefined,
  emailVerified: boolean,
): Promise<boolean> {
  if (!emailVerified || !email || !isBackendConfigured()) return false;
  const res = await apiTry<{ granted?: boolean }>('/grants/school-seat', { method: 'POST' }, {});
  return res.granted === true;
}
