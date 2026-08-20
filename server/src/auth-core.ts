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

/** What the Google-callback link decision needs to know about both sides. */
export interface GoogleLinkCandidate {
  /** Google's `email_verified` claim for the address it just asserted. */
  googleEmailVerified: boolean;
  /** Whether the row already found by that address has proven the mailbox. */
  existingEmailVerified: boolean;
  /** Whether that row carries a password credential a squatter could keep using. */
  existingHasPassword: boolean;
}

/**
 * Whether a Google sign-in may adopt an existing account matched by email address.
 *
 * Matching on the address alone hands the account to whoever registered it first:
 * an unverified password row is a claim, not proof of ownership, and its
 * `password_hash` keeps working after the link — so its owner inherits the
 * victim's session, logbook, records and entitlements. The link also sets
 * `email_verified`, which is the sole ownership proof the staff and school-seat
 * grants consume, so the same merge doubles as a grant-escalation primitive.
 *
 * Linking is therefore allowed only when Google has verified the address AND the
 * existing row either verified it too (both sides proved the same mailbox) or holds
 * no password for anyone to retain. Everything else must go through the ordinary
 * verify/reset flow instead of being merged silently.
 */
export function mayLinkGoogleToExistingAccount(candidate: GoogleLinkCandidate): boolean {
  if (!candidate.googleEmailVerified) return false;
  return candidate.existingEmailVerified || !candidate.existingHasPassword;
}
