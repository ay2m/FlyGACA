/**
 * Pure fixed-window rate limiter — no Firebase/Express imports so it is
 * unit-testable (the billing-core/feedback-core pattern). Backs the per-uid
 * chat limit (DESIGN §8 N4's "per-session/per-uid" cost control): the IP tier
 * in gateway.ts is a best-effort backstop, this is the hard ceiling.
 *
 * State is per-instance memory. With `maxInstances: 10` the real ceiling is
 * `limit × instances` — the same caveat as express-rate-limit's MemoryStore,
 * and acceptable for a cost control (not a security boundary).
 */

export interface RateLimitOptions {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Whole seconds until the window resets (≥ 1 when blocked) — Retry-After. */
  retryAfterSec: number;
}

interface Window {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: RateLimitOptions) {
  const windows = new Map<string, Window>();

  return {
    /** Count one request for `key`; `now` is injectable for tests. */
    check(key: string, now: number = Date.now()): RateLimitVerdict {
      // Prune expired windows so the map stays bounded by active keys.
      for (const [k, w] of windows) {
        if (w.resetAt <= now) windows.delete(k);
      }

      let w = windows.get(key);
      if (!w) {
        w = { count: 0, resetAt: now + opts.windowMs };
        windows.set(key, w);
      }
      w.count += 1;
      const retryAfterSec = Math.max(1, Math.ceil((w.resetAt - now) / 1000));
      return { allowed: w.count <= opts.limit, retryAfterSec };
    },
  };
}
