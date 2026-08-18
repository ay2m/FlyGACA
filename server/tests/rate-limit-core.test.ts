import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/rate-limit-core.js";

const T0 = 1_000_000; // arbitrary fixed epoch for injectable-now tests

describe("createRateLimiter", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.check("u1", T0).allowed).toBe(true);
    expect(limiter.check("u1", T0).allowed).toBe(true);
    expect(limiter.check("u1", T0).allowed).toBe(true);
    expect(limiter.check("u1", T0).allowed).toBe(false);
  });

  it("reports whole seconds until the window resets when blocked", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("u1", T0);
    // 10.5s into the window → 49.5s left → ceil to 50.
    const verdict = limiter.check("u1", T0 + 10_500);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterSec).toBe(50);
  });

  it("reports at least 1 second even at the window edge", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("u1", T0);
    expect(limiter.check("u1", T0 + 59_900).retryAfterSec).toBe(1);
  });

  it("resets the count once the window rolls over", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check("u1", T0).allowed).toBe(true);
    expect(limiter.check("u1", T0 + 1).allowed).toBe(false);
    expect(limiter.check("u1", T0 + 60_000).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check("u1", T0).allowed).toBe(true);
    expect(limiter.check("u2", T0).allowed).toBe(true);
    expect(limiter.check("u1", T0).allowed).toBe(false);
    expect(limiter.check("u2", T0).allowed).toBe(false);
  });

  it("prunes expired windows so a returning key starts fresh", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("u1", T0);
    limiter.check("u1", T0); // now blocked
    // A different key's check after expiry prunes u1's stale window…
    limiter.check("u2", T0 + 120_000);
    // …so u1 gets a clean window at the new time.
    expect(limiter.check("u1", T0 + 120_000).allowed).toBe(true);
  });
});
