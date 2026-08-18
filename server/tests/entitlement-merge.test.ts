import { describe, expect, it } from "vitest";
import { mergeUpward } from "../src/routes/billing.js";
import type { Entitlement } from "../src/billing-core.js";

/**
 * `mergeUpward` is the guard that stops a grant from clobbering a paying user.
 * Every writer of the `entitlements` table goes through it, so the "never
 * downgrade, never shorten" invariant is worth pinning explicitly rather than
 * inferring from the billing routes that call it.
 */

const YEAR_2030 = "2030-01-01T00:00:00.000Z";
const YEAR_2028 = "2028-01-01T00:00:00.000Z";
const YEAR_2020 = "2020-01-01T00:00:00.000Z"; // safely in the past

const pro = (expiresAt?: string): Entitlement => ({
  plan: "pro",
  source: "moyasar",
  ...(expiresAt ? { expiresAt } : {}),
});

describe("mergeUpward — no current entitlement", () => {
  it("takes the new grant when there is nothing to protect", () => {
    expect(mergeUpward(null, pro(YEAR_2030))).toEqual(pro(YEAR_2030));
  });

  it("replaces a free plan outright", () => {
    expect(mergeUpward({ plan: "free" }, pro(YEAR_2030))).toEqual(pro(YEAR_2030));
  });

  it("replaces a LAPSED paid plan — an expired plan is not a downgrade to protect", () => {
    expect(mergeUpward(pro(YEAR_2020), pro(YEAR_2030))).toEqual(pro(YEAR_2030));
  });
});

describe("mergeUpward — expiry never shortens", () => {
  it("keeps the current expiry when it outlasts the new grant", () => {
    const merged = mergeUpward(pro(YEAR_2030), pro(YEAR_2028));
    expect(merged.expiresAt).toBe(YEAR_2030);
  });

  it("takes the new expiry when it outlasts the current one", () => {
    const merged = mergeUpward(pro(YEAR_2028), pro(YEAR_2030));
    expect(merged.expiresAt).toBe(YEAR_2030);
  });

  it("treats an absent expiry as non-expiring, so it beats any dated grant", () => {
    const staff: Entitlement = { plan: "school", source: "staff" };
    const merged = mergeUpward(staff, pro(YEAR_2030));
    expect(merged.expiresAt).toBeUndefined();
    expect(merged.source).toBe("staff");
  });

  it("carries the source of whichever entitlement survives, so it stays attributable", () => {
    const school: Entitlement = { plan: "school", source: "school", expiresAt: YEAR_2030 };
    expect(mergeUpward(school, pro(YEAR_2028)).source).toBe("school");
    expect(mergeUpward(pro(YEAR_2028), school).source).toBe("school");
  });
});

describe("mergeUpward — plan never downgrades", () => {
  it("keeps an in-force school tier when a pro purchase lands on top", () => {
    const school: Entitlement = { plan: "school", source: "school", expiresAt: YEAR_2030 };
    expect(mergeUpward(school, pro(YEAR_2028)).plan).toBe("school");
  });

  it("keeps school even when the incoming pro grant runs LONGER", () => {
    const school: Entitlement = { plan: "school", source: "school", expiresAt: YEAR_2028 };
    const merged = mergeUpward(school, pro(YEAR_2030));
    // The longer expiry wins, but the higher tier still stands.
    expect(merged).toEqual({ plan: "school", source: "moyasar", expiresAt: YEAR_2030 });
  });

  it("upgrades free → pro", () => {
    expect(mergeUpward({ plan: "free" }, pro(YEAR_2030)).plan).toBe("pro");
  });

  it("a founding comp cannot shorten an active paid plan", () => {
    const paid = pro(YEAR_2030);
    const comp: Entitlement = { plan: "pro", source: "founding", expiresAt: YEAR_2028 };
    expect(mergeUpward(paid, comp)).toEqual(paid);
  });
});
