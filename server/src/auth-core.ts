/**
 * Auth-context policy — the pure, Firebase-free half of the gateway's
 * authentication. It parses the raw `Authorization` header into a bearer token and
 * distils a decoded Firebase ID token into the claims the gateway actually cares
 * about: `uid`, `email`, and whether the email is verified.
 *
 * Kept separate from `gateway.ts` (which owns the `firebase-admin` verification
 * call) so the parsing/claim-reading is unit-testable in isolation — the same shape
 * the staff/school/student cores already consume. Reading `email_verified` here lets
 * the gateway observe verified-vs-unverified sign-ups without changing control flow.
 */

/** The claims the gateway threads through after verifying an ID token. */
export interface AuthContext {
  uid?: string;
  email?: string;
  emailVerified: boolean;
}

/** The subset of a decoded Firebase ID token this module reads. */
export interface DecodedIdTokenLike {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

/**
 * Pull the bearer token out of an `Authorization` header. Returns `undefined` for a
 * missing header or any non-`Bearer` scheme (case-sensitive `Bearer ` prefix, as
 * Firebase clients send). An empty token after the prefix is treated as absent.
 */
export function extractBearerToken(authorization: string | undefined | null): string | undefined {
  if (!authorization || !authorization.startsWith("Bearer ")) return undefined;
  const token = authorization.slice(7).trim();
  return token === "" ? undefined : token;
}

/**
 * Distil a verified, decoded ID token into an `AuthContext`. `emailVerified` is
 * strictly `email_verified === true` so a missing/undefined claim reads as
 * unverified, never as verified.
 */
export function toAuthContext(decoded: DecodedIdTokenLike): AuthContext {
  return {
    uid: decoded.uid,
    email: decoded.email,
    emailVerified: decoded.email_verified === true,
  };
}

/** The context for a request that presented no valid ID token (anonymous caller). */
export function anonymousAuthContext(): AuthContext {
  return { emailVerified: false };
}
