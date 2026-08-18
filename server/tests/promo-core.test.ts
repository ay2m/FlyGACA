import { describe, expect, it } from "vitest";
import {
  MIN_CHARGE_HALALAS,
  applyPromo,
  isPromoApplicable,
  normalizePromoCode,
  priceAfterPromo,
  type PromoCode,
} from "../src/promo-core.js";

const now = new Date("2026-08-01T00:00:00Z");
const future = "2026-12-31T00:00:00Z";
const past = "2026-01-01T00:00:00Z";

describe("normalizePromoCode", () => {
  it("uppercases, strips non-alphanumerics, and caps length", () => {
    expect(normalizePromoCode(" launch-25! ")).toBe("LAUNCH25");
    expect(normalizePromoCode("a".repeat(40))).toHaveLength(24);
    expect(normalizePromoCode(undefined)).toBe("");
    expect(normalizePromoCode("")).toBe("");
  });
});

describe("isPromoApplicable", () => {
  it("accepts an active, in-window percent/fixed code for the kind", () => {
    const pct: PromoCode = { type: "percent", value: 25, active: true, expiresAt: future };
    expect(isPromoApplicable(pct, "pro", now)).toBe(true);
    const fixed: PromoCode = { type: "fixed", value: 5000, active: true };
    expect(isPromoApplicable(fixed, "bundle", now)).toBe(true);
  });

  it("rejects inactive, expired, spent, or out-of-range codes", () => {
    expect(isPromoApplicable({ type: "percent", value: 25 }, "pro", now)).toBe(false); // active !== true
    expect(isPromoApplicable({ type: "percent", value: 25, active: true, expiresAt: past }, "pro", now)).toBe(false);
    expect(isPromoApplicable({ type: "percent", value: 0, active: true }, "pro", now)).toBe(false);
    expect(isPromoApplicable({ type: "percent", value: 120, active: true }, "pro", now)).toBe(false);
    expect(isPromoApplicable({ type: "fixed", value: -1, active: true }, "pro", now)).toBe(false);
    expect(
      isPromoApplicable({ type: "percent", value: 25, active: true, maxRedemptions: 3, redeemed: 3 }, "pro", now),
    ).toBe(false);
    expect(isPromoApplicable(null, "pro", now)).toBe(false);
  });

  it("honours an appliesTo allowlist", () => {
    const p: PromoCode = { type: "percent", value: 25, active: true, appliesTo: ["bundle"] };
    expect(isPromoApplicable(p, "bundle", now)).toBe(true);
    expect(isPromoApplicable(p, "pro", now)).toBe(false);
  });
});

describe("applyPromo", () => {
  it("applies a percentage discount", () => {
    const p: PromoCode = { type: "percent", value: 25, active: true };
    expect(applyPromo(44900, p, "pro", now)).toBe(33675); // 449 → 336.75
  });

  it("applies a fixed (halalas) discount", () => {
    const p: PromoCode = { type: "fixed", value: 5000, active: true };
    expect(applyPromo(19900, p, "bundle", now)).toBe(14900); // 199 → 149
  });

  it("clamps to the minimum charge and never below", () => {
    const p: PromoCode = { type: "percent", value: 100, active: true };
    expect(applyPromo(44900, p, "pro", now)).toBe(MIN_CHARGE_HALALAS);
  });

  it("returns the original amount unchanged when the code doesn't apply", () => {
    expect(applyPromo(44900, null, "pro", now)).toBe(44900);
    expect(applyPromo(44900, { type: "percent", value: 25, active: false }, "pro", now)).toBe(44900);
    const scoped: PromoCode = { type: "percent", value: 25, active: true, appliesTo: ["bundle"] };
    expect(applyPromo(44900, scoped, "pro", now)).toBe(44900);
  });
});

describe("priceAfterPromo", () => {
  it("reports the code only when it actually lowers the amount", () => {
    const p: PromoCode = { type: "percent", value: 25, active: true };
    expect(priceAfterPromo(44900, p, "pro", "LAUNCH25", now)).toEqual({
      amount: 33675,
      promo: "LAUNCH25",
    });
  });

  it("treats a present-but-inapplicable code as no promo", () => {
    // Expired code → applyPromo returns the amount unchanged → not stamped onto the intent.
    const expired: PromoCode = { type: "percent", value: 25, active: true, expiresAt: past };
    expect(priceAfterPromo(44900, expired, "pro", "OLD", now)).toEqual({ amount: 44900, promo: null });
    // Wrong-kind scope.
    const scoped: PromoCode = { type: "percent", value: 25, active: true, appliesTo: ["bundle"] };
    expect(priceAfterPromo(44900, scoped, "pro", "BUNDLEONLY", now)).toEqual({
      amount: 44900,
      promo: null,
    });
    // No code doc at all.
    expect(priceAfterPromo(44900, null, "pro", "MISSING", now)).toEqual({ amount: 44900, promo: null });
  });
});
