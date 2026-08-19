import { describe, expect, it } from "vitest";
import {
  API_TIERS,
  apiTier,
  isOverMonthlyQuota,
  monthKey,
  remainingThisMonth,
} from "../src/api-tier-core.js";

describe("apiTier", () => {
  it("accepts the three known tiers", () => {
    expect(apiTier("starter")).toBe("starter");
    expect(apiTier("growth")).toBe("growth");
    expect(apiTier("scale")).toBe("scale");
    expect(apiTier("enterprise")).toBe("enterprise");
  });

  it("defaults unknown/missing to enterprise (uncapped, backward-compatible)", () => {
    expect(apiTier(undefined)).toBe("enterprise");
    expect(apiTier(null)).toBe("enterprise");
    expect(apiTier("nope")).toBe("enterprise");
    expect(apiTier(42)).toBe("enterprise");
  });
});

describe("monthKey", () => {
  it("buckets by UTC calendar month", () => {
    expect(monthKey(new Date("2026-07-29T23:59:59Z"))).toBe("2026-07");
    expect(monthKey(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });
});

describe("isOverMonthlyQuota", () => {
  it("caps the metered tiers at their monthly quota", () => {
    expect(isOverMonthlyQuota(999, "starter")).toBe(false);
    expect(isOverMonthlyQuota(1000, "starter")).toBe(true);
    expect(isOverMonthlyQuota(4999, "growth")).toBe(false);
    expect(isOverMonthlyQuota(5000, "growth")).toBe(true);
    expect(isOverMonthlyQuota(24999, "scale")).toBe(false);
    expect(isOverMonthlyQuota(25000, "scale")).toBe(true);
  });

  it("never caps the uncapped enterprise tier", () => {
    expect(isOverMonthlyQuota(1_000_000, "enterprise")).toBe(false);
  });
});

describe("remainingThisMonth", () => {
  it("counts down and floors at zero for capped tiers", () => {
    expect(remainingThisMonth(0, "starter")).toBe(1000);
    expect(remainingThisMonth(990, "starter")).toBe(10);
    expect(remainingThisMonth(6000, "starter")).toBe(0);
  });

  it("is null (unlimited) for enterprise", () => {
    expect(remainingThisMonth(999, "enterprise")).toBeNull();
  });
});

describe("API_TIERS pricing (mirror guard for docs/strategy)", () => {
  it("holds the indicative list prices", () => {
    expect(API_TIERS.starter).toEqual({ monthlyQuota: 1000, priceSar: 499 });
    expect(API_TIERS.growth).toEqual({ monthlyQuota: 5000, priceSar: 1999 });
    expect(API_TIERS.scale).toEqual({ monthlyQuota: 25000, priceSar: 6999 });
    expect(API_TIERS.enterprise).toEqual({ monthlyQuota: null, priceSar: null });
  });
});
