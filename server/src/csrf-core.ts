/**
 * CSRF policy for the cookie-authenticated routes — pure, unit-testable.
 *
 * The session travels as an HttpOnly cookie that is `SameSite=None` in
 * production whenever the SPA and the API live on different registrable domains
 * (see `sessionCookieOptions` in session.ts), so the browser attaches it to
 * cross-site requests. The CORS middleware already 403s any request carrying a
 * disallowed `Origin`, which covers the mainline forgery vector (modern
 * browsers send `Origin` on all cross-origin POSTs) — this layer is the
 * defense-in-depth behind it: it also consults `Sec-Fetch-Site`, so a
 * cross-site request that arrives without an `Origin` header is still refused,
 * and it documents exactly which endpoints are *meant* to be called
 * cross-origin by non-browser services.
 *
 * Decision order (first match wins):
 *   1. Safe methods (GET/HEAD/OPTIONS) never mutate — allow.
 *   2. Exempt paths are called by external services that authenticate by other
 *      means (Moyasar webhook signature, Cloud Scheduler CRON_SECRET) — allow.
 *   3. A Bearer credential is attached explicitly by the caller (the native
 *      shell), not ambiently by a browser — CSRF does not apply — allow.
 *   4. `Origin` present → allow iff the CORS allowlist accepts it.
 *   5. No `Origin` but `Sec-Fetch-Site: cross-site` → forged — deny.
 *   6. Neither header (curl, server-to-server, legacy) → no browser ambient
 *      authority in play — allow.
 */

/** Endpoints on the cookie-mounted routers that external services POST to. */
const EXEMPT_PATHS = new Set(["/api/billing/webhook/moyasar", "/api/billing/renew"]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isCsrfExempt(path: string): boolean {
  return EXEMPT_PATHS.has(path);
}

export interface CsrfRequest {
  method: string;
  /** Full request path as Express reports it at the app level (req.originalUrl path). */
  path: string;
  origin: string | undefined;
  secFetchSite: string | undefined;
  /** True when the caller authenticated with an explicit Bearer token. */
  hasBearer: boolean;
  /** The same predicate the CORS gate uses (allowlist + EXTRA_ALLOWED_ORIGINS). */
  isOriginAllowed: (origin: string) => boolean;
}

export function csrfVerdict(req: CsrfRequest): "allow" | "deny" {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return "allow";
  if (isCsrfExempt(req.path)) return "allow";
  if (req.hasBearer) return "allow";
  if (req.origin) return req.isOriginAllowed(req.origin) ? "allow" : "deny";
  if (req.secFetchSite === "cross-site") return "deny";
  return "allow";
}
