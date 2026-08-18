/**
 * Client trigger for the `POST /api/grants/founding` route. On sign-in the app asks
 * the server to grandfather a pre-launch account with a complimentary Pro window
 * (see server/src/founding.ts). Eligibility (account created before the launch
 * cutoff) is decided SERVER-SIDE from the stored account creation time — the client
 * can't check it, so this just makes the call for any verified, still-free user and
 * lets the server grant or decline. Best-effort and idempotent; inert in the
 * local-first build.
 */
import { isBackendConfigured, apiTry } from '@/lib/services/backend';

/**
 * Ask the server to grant the founding entitlement. Resolves `true` only when a grant
 * was actually written (so the caller re-hydrates the entitlement). No-ops (resolves
 * `false`) for an unverified email, an ineligible/newer account, an already-entitled
 * user, a local-only build, or when the API isn't reachable.
 */
export async function claimFoundingAccessIfEligible(emailVerified: boolean): Promise<boolean> {
  if (!emailVerified || !isBackendConfigured()) return false;
  const res = await apiTry<{ granted?: boolean }>('/grants/founding', { method: 'POST' }, {});
  return res.granted === true;
}
