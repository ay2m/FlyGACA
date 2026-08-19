import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PACK_TIERS,
  MAX_RENEWAL_ATTEMPTS,
  PASS_DAYS,
  RENEWAL_LEAD_DAYS,
  SELLABLE_PACK_IDS,
  amountForCheckout,
  cadenceOf,
  checkoutKind,
  describeCheckout,
  packTier,
  cadenceDays,
  effectivePlan,
  entitlementFromCheckout,
  entitlementFromPass,
  extendExpiry,
  isPaidActive,
  isRecurringKind,
  nextChargeAt,
  paymentMatchesIntent,
  redirectForIntent,
  renewalBaseDate,
  renewalFailureOutcome,
  sarToHalalas,
  sellablePackId,
  verifyMoyasarSignature,
  verifyMoyasarWebhook,
  webhookPaymentId,
  type PriceEnv,
} from "../src/billing-core.js";

const env: PriceEnv = {
  proMonthly: "59",
  proAnnual: "449",
  pass: "149",
  credits: "19",
  prepPack: "49",
  prepPackEssential: "249",
  prepPackStandard: "399",
  prepPackComplete: "499",
  bundle: "199",
  cohort: "6000",
};

describe("sarToHalalas", () => {
  it("converts a SAR major-unit string to integer halalas", () => {
    expect(sarToHalalas("59")).toBe(5900);
    expect(sarToHalalas("449.00")).toBe(44900);
    expect(sarToHalalas("39.5")).toBe(3950);
  });

  it("throws on a missing, zero, negative or non-numeric price", () => {
    expect(() => sarToHalalas(undefined)).toThrow();
    expect(() => sarToHalalas("")).toThrow();
    expect(() => sarToHalalas("0")).toThrow();
    expect(() => sarToHalalas("-5")).toThrow();
    expect(() => sarToHalalas("nope")).toThrow();
  });
});

describe("amountForCheckout", () => {
  it("prices Pro by cadence", () => {
    expect(amountForCheckout("pro", "monthly", env)).toBe(5900);
    expect(amountForCheckout("pro", "annual", env)).toBe(44900);
  });

  it("prices the one-time SKUs regardless of cadence", () => {
    expect(amountForCheckout("pass", undefined, env)).toBe(14900);
    expect(amountForCheckout("credits", undefined, env)).toBe(1900);
    expect(amountForCheckout("bundle", undefined, env)).toBe(19900);
    expect(amountForCheckout("cohort", undefined, env)).toBe(600000);
  });

  it("prices exam-prep packs by content band", () => {
    // Deepest banks (plus ground school / a reading path) at the top band.
    expect(amountForCheckout("pack", undefined, env, "ppl-exam")).toBe(49900);
    expect(amountForCheckout("pack", undefined, env, "cpl")).toBe(49900);
    // A full topic spread at the mid band.
    expect(amountForCheckout("pack", undefined, env, "ir")).toBe(39900);
    expect(amountForCheckout("pack", undefined, env, "atpl")).toBe(39900);
    // Focused banks at the entry band — `conversion` is a certificate pack but carries
    // only 76 questions, which is exactly why the band replaced the cert/subject split.
    expect(amountForCheckout("pack", undefined, env, "conversion")).toBe(24900);
    expect(amountForCheckout("pack", undefined, env, "medical")).toBe(24900);
    expect(amountForCheckout("pack", undefined, env, "aip")).toBe(24900);
    // No packId → entry band (falls back to the legacy flat price if a band is unset).
    expect(amountForCheckout("pack", undefined, env)).toBe(24900);
  });
});

describe("isRecurringKind", () => {
  it("is true only for pro", () => {
    expect(isRecurringKind("pro")).toBe(true);
    expect(isRecurringKind("pass")).toBe(false);
    expect(isRecurringKind("credits")).toBe(false);
    expect(isRecurringKind("pack")).toBe(false);
    expect(isRecurringKind("bundle")).toBe(false);
    expect(isRecurringKind("cohort")).toBe(false);
  });
});

describe("effectivePlan", () => {
  const now = new Date("2026-07-12T10:00:00Z");
  const future = new Date("2026-08-01T00:00:00Z").toISOString();
  const past = new Date("2026-07-01T00:00:00Z").toISOString();

  it("treats a null/undefined or free entitlement as free", () => {
    expect(effectivePlan(null, now)).toBe("free");
    expect(effectivePlan(undefined, now)).toBe("free");
    expect(effectivePlan({ plan: "free" }, now)).toBe("free");
  });

  it("keeps a paid plan whose expiry is in the future", () => {
    expect(effectivePlan({ plan: "pro", expiresAt: future, source: "moyasar" }, now)).toBe("pro");
    expect(effectivePlan({ plan: "school", expiresAt: future, source: "school" }, now)).toBe(
      "school",
    );
  });

  it("collapses a paid plan whose expiry has passed to free", () => {
    expect(effectivePlan({ plan: "pro", expiresAt: past, source: "moyasar" }, now)).toBe("free");
  });

  it("keeps a non-expiring grant (no expiresAt) — e.g. school/staff", () => {
    expect(effectivePlan({ plan: "school", source: "school" }, now)).toBe("school");
    expect(effectivePlan({ plan: "pro", source: "staff" }, now)).toBe("pro");
  });
});

describe("isPaidActive", () => {
  const now = new Date("2026-07-12T10:00:00Z");
  const future = new Date("2026-08-01T00:00:00Z").toISOString();
  const past = new Date("2026-07-01T00:00:00Z").toISOString();

  it("is false for free / null / lapsed entitlements", () => {
    expect(isPaidActive(null, now)).toBe(false);
    expect(isPaidActive({ plan: "free" }, now)).toBe(false);
    expect(isPaidActive({ plan: "pro", expiresAt: past, source: "moyasar" }, now)).toBe(false);
  });

  it("is true for an active or non-expiring paid entitlement", () => {
    expect(isPaidActive({ plan: "pro", expiresAt: future, source: "moyasar" }, now)).toBe(true);
    expect(isPaidActive({ plan: "school", source: "school" }, now)).toBe(true);
  });
});

describe("sellablePackId", () => {
  it("accepts every sellable pack id", () => {
    for (const id of SELLABLE_PACK_IDS) expect(sellablePackId(id)).toBe(id);
  });

  it("rejects a 'soon' / free / unknown pack id", () => {
    expect(sellablePackId("airspace-vfr")).toBeNull();
    expect(sellablePackId("foi")).toBeNull();
    expect(sellablePackId("nope")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(sellablePackId(undefined)).toBeNull();
    expect(sellablePackId(null)).toBeNull();
    expect(sellablePackId(42)).toBeNull();
    expect(sellablePackId({ id: "ppl-exam" })).toBeNull();
  });

  it("assigns every sellable pack a price band", () => {
    // A sellable pack with no band would silently fall to the entry price, so the map
    // must cover the catalog exactly.
    for (const id of SELLABLE_PACK_IDS) expect(PACK_TIERS[id]).toBeTruthy();
    expect(packTier("ppl-exam")).toBe("complete");
    expect(packTier("ir")).toBe("standard");
    expect(packTier("conversion")).toBe("essential");
    expect(packTier("nope")).toBe("essential");
    expect(packTier(undefined)).toBe("essential");
  });

  it("mirrors the paid+live packs (guards against catalog drift)", () => {
    expect([...SELLABLE_PACK_IDS]).toEqual([
      "ppl-exam",
      "medical",
      "aip",
      "elp",
      "conversion",
      "cpl",
      "ir",
      "atpl",
    ]);
  });
});

describe("entitlementFromPass", () => {
  const now = new Date("2026-07-12T10:00:00Z");
  const passExpiry = new Date(now.getTime() + PASS_DAYS * 24 * 60 * 60 * 1000).toISOString();

  it("grants PASS_DAYS of Pro from now for a new/free buyer", () => {
    expect(entitlementFromPass(now)).toEqual({
      plan: "pro",
      source: "moyasar",
      expiresAt: passExpiry,
    });
    expect(entitlementFromPass(now, { plan: "free" })).toEqual({
      plan: "pro",
      source: "moyasar",
      expiresAt: passExpiry,
    });
  });

  it("extends a paid plan that expires sooner than the pass window", () => {
    const soon = new Date("2026-07-20T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: soon, source: "moyasar" }).expiresAt,
    ).toBe(passExpiry);
  });

  it("never shortens a later existing expiry", () => {
    const later = new Date("2027-01-01T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: later, source: "moyasar" }).expiresAt,
    ).toBe(later);
  });

  it("preserves an active school tier", () => {
    const later = new Date("2027-01-01T00:00:00Z").toISOString();
    expect(entitlementFromPass(now, { plan: "school", expiresAt: later, source: "school" })).toEqual(
      { plan: "school", source: "moyasar", expiresAt: later },
    );
  });

  it("treats a lapsed paid plan as free (fresh 90-day pass)", () => {
    const past = new Date("2026-01-01T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: past, source: "moyasar" }).expiresAt,
    ).toBe(passExpiry);
  });
});

describe("cadence/renewal math", () => {
  it("cadenceDays: 30 for monthly, 365 for annual", () => {
    expect(cadenceDays("monthly")).toBe(30);
    expect(cadenceDays("annual")).toBe(365);
  });

  it("extendExpiry adds one cadence period FROM the given date, not from now", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    expect(extendExpiry(base, "monthly").toISOString()).toBe(
      new Date("2026-01-31T00:00:00Z").toISOString(),
    );
    expect(extendExpiry(base, "annual").toISOString()).toBe(
      new Date("2027-01-01T00:00:00Z").toISOString(),
    );
  });

  it("nextChargeAt is RENEWAL_LEAD_DAYS before expiry by default", () => {
    const expiry = new Date("2026-02-01T00:00:00Z");
    expect(nextChargeAt(expiry).toISOString()).toBe(
      new Date(expiry.getTime() - RENEWAL_LEAD_DAYS * 86400000).toISOString(),
    );
    expect(nextChargeAt(expiry, 7).toISOString()).toBe(
      new Date(expiry.getTime() - 7 * 86400000).toISOString(),
    );
  });

  it("entitlementFromCheckout grants pro, extended from the given base date", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    expect(entitlementFromCheckout("monthly", base)).toEqual({
      plan: "pro",
      source: "moyasar",
      expiresAt: extendExpiry(base, "monthly").toISOString(),
    });
  });

  it("MAX_RENEWAL_ATTEMPTS is a small positive retry budget", () => {
    expect(MAX_RENEWAL_ATTEMPTS).toBeGreaterThan(0);
    expect(MAX_RENEWAL_ATTEMPTS).toBeLessThanOrEqual(RENEWAL_LEAD_DAYS + 3);
  });
});

describe("checkoutKind", () => {
  it("narrows every known kind and rejects the rest", () => {
    for (const k of ["pro", "pass", "credits", "pack", "bundle", "cohort"]) {
      expect(checkoutKind(k)).toBe(k);
    }
    expect(checkoutKind("gift")).toBeNull();
    expect(checkoutKind("")).toBeNull();
    expect(checkoutKind(undefined)).toBeNull();
    expect(checkoutKind(7)).toBeNull();
    expect(checkoutKind({ kind: "pro" })).toBeNull();
  });
});

describe("cadenceOf", () => {
  it("is monthly only for the exact string, annual otherwise", () => {
    expect(cadenceOf("monthly")).toBe("monthly");
    expect(cadenceOf("annual")).toBe("annual");
    expect(cadenceOf("yearly")).toBe("annual");
    expect(cadenceOf(undefined)).toBe("annual");
    expect(cadenceOf(null)).toBe("annual");
  });
});

describe("describeCheckout", () => {
  it("names each product line; pack interpolates the packId", () => {
    expect(describeCheckout("pro")).toBe("Fly GACA Pro");
    expect(describeCheckout("pass")).toBe("Fly GACA Exam Season Pass");
    expect(describeCheckout("credits")).toBe("Fly GACA Captain Adel credit pack");
    expect(describeCheckout("pack", "ppl-exam")).toBe("Fly GACA Exam Prep Pack — ppl-exam");
    expect(describeCheckout("pack")).toBe("Fly GACA Exam Prep Pack — ");
    expect(describeCheckout("bundle")).toBe("Fly GACA All-Access Exam Bundle");
    expect(describeCheckout("cohort")).toBe("Fly GACA B2B Cohort (up to 25 seats, 90-day intake)");
  });
});

describe("redirectForIntent", () => {
  it("routes each kind to its success destination", () => {
    expect(redirectForIntent({ kind: "pack", packId: "ppl-exam" }, true)).toBe(
      "/study/packs/ppl-exam?checkout=success",
    );
    expect(redirectForIntent({ kind: "bundle" }, true)).toBe("/study/packs?checkout=success");
    expect(redirectForIntent({ kind: "cohort" }, true)).toBe("/business/admin?checkout=success");
    expect(redirectForIntent({ kind: "pro" }, true)).toBe("/account?checkout=success");
    // A pack success with no packId falls through to the generic account destination.
    expect(redirectForIntent({ kind: "pack" }, true)).toBe("/account?checkout=success");
  });

  it("routes each kind to its cancel destination", () => {
    expect(redirectForIntent({ kind: "pack", packId: "cpl" }, false)).toBe(
      "/study/packs/cpl?checkout=cancel",
    );
    expect(redirectForIntent({ kind: "bundle" }, false)).toBe("/study/packs?checkout=cancel");
    expect(redirectForIntent({ kind: "cohort" }, false)).toBe("/schools?checkout=cancel");
    expect(redirectForIntent({ kind: "pro" }, false)).toBe("/pricing?checkout=cancel");
  });
});

describe("paymentMatchesIntent", () => {
  it("is true only when amount AND currency both match", () => {
    const intent = { amount: 44900, currency: "SAR" };
    expect(paymentMatchesIntent({ amount: 44900, currency: "SAR" }, intent)).toBe(true);
    expect(paymentMatchesIntent({ amount: 100, currency: "SAR" }, intent)).toBe(false);
    expect(paymentMatchesIntent({ amount: 44900, currency: "USD" }, intent)).toBe(false);
  });
});

describe("webhookPaymentId", () => {
  it("prefers data.id, falls back to a top-level id, else undefined", () => {
    expect(webhookPaymentId({ data: { id: "pay_1" }, id: "evt_1" })).toBe("pay_1");
    expect(webhookPaymentId({ id: "pay_2" })).toBe("pay_2");
    expect(webhookPaymentId({ data: {} })).toBeUndefined();
    expect(webhookPaymentId(undefined)).toBeUndefined();
  });
});

describe("renewalFailureOutcome", () => {
  it("marks past_due and schedules a retry below the attempt budget", () => {
    expect(renewalFailureOutcome(0)).toEqual({ attempts: 1, gaveUp: false, status: "past_due" });
    expect(renewalFailureOutcome(MAX_RENEWAL_ATTEMPTS - 2)).toMatchObject({
      gaveUp: false,
      status: "past_due",
    });
  });

  it("gives up (cancel + auto-renew off) once the budget is spent", () => {
    expect(renewalFailureOutcome(MAX_RENEWAL_ATTEMPTS - 1)).toEqual({
      attempts: MAX_RENEWAL_ATTEMPTS,
      gaveUp: true,
      status: "canceled",
      autoRenew: false,
    });
  });
});

describe("renewalBaseDate", () => {
  const now = new Date("2026-07-12T10:00:00Z");

  it("extends from the current expiry when present", () => {
    expect(renewalBaseDate("2026-08-01T00:00:00Z", now).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("falls back to now when there is no current expiry", () => {
    expect(renewalBaseDate(undefined, now)).toBe(now);
  });

  it("pins the from-past-expiry behavior (extends from the old expiry, not from now)", () => {
    const past = "2026-01-01T00:00:00Z";
    expect(renewalBaseDate(past, now).toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("verifyMoyasarWebhook", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "payment_paid" });
  const validSig = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts the shared secret sent as a secret_token body field", () => {
    // Moyasar's documented scheme, and what the pre-Cloud-Run implementation used.
    expect(verifyMoyasarWebhook(body, undefined, secret, secret)).toBe(true);
  });

  it("still accepts an HMAC x-moyasar-signature header", () => {
    expect(verifyMoyasarWebhook(body, validSig, undefined, secret)).toBe(true);
  });

  it("rejects a wrong secret_token, and a non-string one", () => {
    expect(verifyMoyasarWebhook(body, undefined, "not-the-secret", secret)).toBe(false);
    expect(verifyMoyasarWebhook(body, undefined, { evil: true }, secret)).toBe(false);
    expect(verifyMoyasarWebhook(body, undefined, "", secret)).toBe(false);
  });

  it("rejects when neither scheme is present", () => {
    expect(verifyMoyasarWebhook(body, undefined, undefined, secret)).toBe(false);
  });

  it("fails closed when no webhook secret is configured", () => {
    // An unset MOYASAR_WEBHOOK_SECRET must never make an unsigned POST authentic.
    expect(verifyMoyasarWebhook(body, undefined, "", "")).toBe(false);
    expect(verifyMoyasarWebhook(body, validSig, undefined, "")).toBe(false);
    expect(verifyMoyasarWebhook(body, undefined, undefined, "")).toBe(false);
  });
});

describe("verifyMoyasarSignature", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "payment_paid" });
  const validSig = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a correctly-signed body", () => {
    expect(verifyMoyasarSignature(body, validSig, secret)).toBe(true);
  });

  it("rejects a missing, wrong, or malformed signature", () => {
    expect(verifyMoyasarSignature(body, undefined, secret)).toBe(false);
    expect(verifyMoyasarSignature(body, "deadbeef", secret)).toBe(false);
    expect(verifyMoyasarSignature(body, [validSig], secret)).toBe(false);
  });

  it("rejects a valid signature for a different body (tamper detection)", () => {
    expect(verifyMoyasarSignature(body + "x", validSig, secret)).toBe(false);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const wrongSig = createHmac("sha256", "other-secret").update(body).digest("hex");
    expect(verifyMoyasarSignature(body, wrongSig, secret)).toBe(false);
  });
});
