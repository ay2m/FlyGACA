/**
 * Promo-code policy — validate a discount code and compute the discounted checkout
 * amount. Pure (no Firebase/Express imports) so it is unit-testable; the checkout
 * callable reads the `promoCodes/{code}` doc and applies these functions SERVER-SIDE.
 * The client only ever passes the code string — it never decides a price, so a
 * tampered client can't discount its own checkout.
 *
 * The discount is applied to the INITIAL checkout amount only (one-time purchases and
 * the first charge of a subscription). The token-renewal engine charges the full list
 * price, so a promo is inherently "first charge X% off" — no per-renewal discount to
 * track.
 */
import type { CheckoutKind } from "./billing-core.js";

export interface PromoCode {
  /** `percent` → `value` is 0–100 (% off); `fixed` → `value` is halalas off. */
  type: "percent" | "fixed";
  value: number;
  /** A code is off unless `active` is explicitly true. */
  active?: boolean;
  /** Restrict to these checkout kinds; omit/empty = every kind. */
  appliesTo?: CheckoutKind[];
  /** ISO expiry; a code at/after this instant never applies. */
  expiresAt?: string;
  /** Redemption cap; once `redeemed` reaches it, the code is spent. */
  maxRedemptions?: number;
  redeemed?: number;
}

/** Uppercased, alphanumeric-only, ≤ 24 chars. Mirrors the client `?promo=` normaliser. */
export function normalizePromoCode(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 24);
}

/** Whether `promo` may be applied to a `kind` checkout at `now`. */
export function isPromoApplicable(
  promo: PromoCode | null | undefined,
  kind: CheckoutKind,
  now: Date = new Date(),
): boolean {
  if (!promo || promo.active !== true) return false;
  if (promo.type === "percent") {
    if (!(promo.value > 0 && promo.value <= 100)) return false;
  } else if (promo.type === "fixed") {
    if (!(promo.value > 0)) return false;
  } else {
    return false;
  }
  if (promo.expiresAt) {
    const exp = Date.parse(promo.expiresAt);
    if (!Number.isFinite(exp) || exp <= now.getTime()) return false;
  }
  if (typeof promo.maxRedemptions === "number" && (promo.redeemed ?? 0) >= promo.maxRedemptions) {
    return false;
  }
  if (promo.appliesTo && promo.appliesTo.length > 0 && !promo.appliesTo.includes(kind)) {
    return false;
  }
  return true;
}

/**
 * The lowest a discounted checkout may fall to (halalas) — Moyasar needs a positive
 * charge and a promo should never zero out a sale. SAR 1.00.
 */
export const MIN_CHARGE_HALALAS = 100;

/**
 * Apply an applicable promo to a halalas amount, clamped to {@link MIN_CHARGE_HALALAS}
 * and never above the original. Returns the ORIGINAL amount unchanged when the promo
 * doesn't apply — so callers can compare `applyPromo(...) < amount` to know if a
 * discount landed.
 */
export function applyPromo(
  amountHalalas: number,
  promo: PromoCode | null | undefined,
  kind: CheckoutKind,
  now: Date = new Date(),
): number {
  if (!isPromoApplicable(promo, kind, now)) return amountHalalas;
  const p = promo as PromoCode;
  const off = p.type === "percent" ? Math.round((amountHalalas * p.value) / 100) : Math.round(p.value);
  const discounted = amountHalalas - off;
  return Math.max(MIN_CHARGE_HALALAS, Math.min(amountHalalas, discounted));
}

/**
 * Price a checkout after a resolved promo, reporting the code back ONLY when it
 * actually lowered the amount — so a present-but-inapplicable code (expired, wrong
 * kind, spent) is treated as no promo (amount unchanged, `promo: null`) rather than
 * stamped onto the intent. The checkout callable passes the `promoCodes/{code}` doc it
 * read; pricing stays entirely server-side.
 */
export function priceAfterPromo(
  rawAmountHalalas: number,
  promo: PromoCode | null | undefined,
  kind: CheckoutKind,
  code: string,
  now: Date = new Date(),
): { amount: number; promo: string | null } {
  const discounted = applyPromo(rawAmountHalalas, promo, kind, now);
  return discounted < rawAmountHalalas
    ? { amount: discounted, promo: code }
    : { amount: rawAmountHalalas, promo: null };
}
