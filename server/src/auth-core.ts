/**
 * Auth-context policy — the pure half of the gateway's authentication. It parses
 * the raw `Authorization` header into a bearer token and defines the claims shape
 * (`uid`, `email`, `emailVerified`) the gateway threads through to the
 * staff/school/student cores.
 *
 * Kept separate from `gateway.ts` (which owns session/API-key verification) so the
 * parsing is unit-testable in isolation.
 */

/** The claims the gateway threads through after verifying a caller. */
export interface AuthContext {
  uid?: string;
  email?: string;
  emailVerified: boolean;
}

/**
 * Pull the bearer token out of an `Authorization` header. Returns `undefined` for a
 * missing header or any non-`Bearer` scheme (case-sensitive `Bearer ` prefix). An
 * empty token after the prefix is treated as absent.
 */
export function extractBearerToken(authorization: string | undefined | null): string | undefined {
  if (!authorization || !authorization.startsWith("Bearer ")) return undefined;
  const token = authorization.slice(7).trim();
  return token === "" ? undefined : token;
}

/** The context for a request that presented no valid credential (anonymous caller). */
export function anonymousAuthContext(): AuthContext {
  return { emailVerified: false };
}

/**
 * The password policy — a strict mirror of the client's
 * `src/calc/app/passwordPolicy.ts` (four rules: length ≥ 8, mixed case, a
 * digit, a non-alphanumeric). The client meter is UX; THIS is the gate — the
 * register and reset-confirm routes must never accept a password the sign-up
 * form would reject. `tests/client-server-mirrors.test.ts` (in the app
 * package) pins the two implementations to the same verdicts.
 */
export const PASSWORD_RULES: { id: string; test: (v: string) => boolean }[] = [
  { id: "length", test: (v) => v.length >= 8 },
  { id: "mixed", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", test: (v) => /\d/.test(v) },
  { id: "special", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** True only when the password satisfies EVERY rule. */
export function meetsPasswordPolicy(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
