import { describe, expect, it } from "vitest";
import {
  FOUNDING_CUTOFF_ISO,
  FOUNDING_GRANT_DAYS,
  foundingEntitlement,
  isFoundingEligible,
} from "../src/founding-core.js";
import { effectivePlan, type Entitlement } from "../src/billing-core.js";

const cutoffMs = Date.parse(FOUNDING_CUTOFF_ISO);

describe("isFoundingEligible", () => {
  it("is true for an account created before the cutoff", () => {
    expect(isFoundingEligible(cutoffMs - 1)).toBe(true);
    expect(isFoundingEligible(Date.parse("2026-01-01T00:00:00Z"))).toBe(true);
  });

  it("is false for an account created at/after the cutoff", () => {
    expect(isFoundingEligible(cutoffMs)).toBe(false);
    expect(isFoundingEligible(cutoffMs + 1)).toBe(false);
  });

  it("is false for a missing/invalid creation time", () => {
    expect(isFoundingEligible(null)).toBe(false);
    expect(isFoundingEligible(undefined)).toBe(false);
    expect(isFoundingEligible(Number.NaN)).toBe(false);
  });
});

describe("foundingEntitlement", () => {
  const now = new Date("2026-07-15T00:00:00Z");

  it("grants FOUNDING_GRANT_DAYS of Pro from now, tagged 'founding'", () => {
    const ent = foundingEntitlement(now);
    expect(ent.plan).toBe("pro");
    expect(ent.source).toBe("founding");
    const expected = new Date(now.getTime() + FOUNDING_GRANT_DAYS * 86400_000).toISOString();
    expect(ent.expiresAt).toBe(expected);
    expect(effectivePlan(ent, now)).toBe("pro");
  });

  it("never shortens a later paid expiry (upgrade-only)", () => {
    const later = new Date(now.getTime() + 400 * 86400_000).toISOString();
    const current: Entitlement = { plan: "pro", source: "moyasar", expiresAt: later };
    expect(foundingEntitlement(now, current).expiresAt).toBe(later);
  });

  it("preserves an active school tier rather than downgrading to pro", () => {
    const current: Entitlement = { plan: "school", source: "school" };
    expect(foundingEntitlement(now, current).plan).toBe("school");
  });

  it("ignores a lapsed paid plan (grants the fresh Pro window)", () => {
    const past = new Date(now.getTime() - 10 * 86400_000).toISOString();
    const lapsed: Entitlement = { plan: "pro", source: "moyasar", expiresAt: past };
    const ent = foundingEntitlement(now, lapsed);
    expect(ent.plan).toBe("pro");
    expect(Date.parse(ent.expiresAt!)).toBeGreaterThan(now.getTime());
  });
});
