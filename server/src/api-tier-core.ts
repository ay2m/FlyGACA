/**
 * Licensed-API tier policy — the plans a partner API key is sold on, and the pure
 * monthly-quota maths the gateway enforces. No Firebase imports so it is unit-testable
 * (the billing-core / chat-quota-core pattern). The `/v1/ask` gateway route reads a
 * key's `tier` + its month-bucketed usage and applies these functions.
 *
 * The per-minute rate limiter in the gateway is a separate, coarse safety net applied
 * to every key; TIER is about the monthly answer allowance that's actually sold.
 */

/** Sold API plans. `enterprise` is uncapped/custom (negotiated), so it's also the
 * safe default for a legacy key minted before tiers existed. */
export type ApiTier = "starter" | "growth" | "enterprise";

export interface ApiTierSpec {
  /** Answers included per calendar month; `null` = uncapped (enterprise/custom). */
  monthlyQuota: number | null;
  /** Indicative SAR/month list price; `null` = custom (contact sales). */
  priceSar: number | null;
}

/** Indicative pricing — mirrors docs/PRICING-REVENUE-STRATEGY.md and docs/LICENSED-API.md. */
export const API_TIERS: Record<ApiTier, ApiTierSpec> = {
  starter: { monthlyQuota: 5000, priceSar: 499 },
  growth: { monthlyQuota: 25000, priceSar: 1999 },
  enterprise: { monthlyQuota: null, priceSar: null },
};

/** Narrow untrusted input (a key doc's `tier` field) to a valid tier, defaulting to
 * `enterprise` (uncapped) so a key minted before tiers existed is never throttled. */
export function apiTier(v: unknown): ApiTier {
  return v === "starter" || v === "growth" || v === "enterprise" ? v : "enterprise";
}

/** Calendar-month bucket key in UTC, e.g. "2026-07" — the field usage is counted under. */
export function monthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/** Whether `used` answers this month meets/exceeds the tier's monthly quota (uncapped
 * tiers are never over). */
export function isOverMonthlyQuota(used: number, tier: ApiTier): boolean {
  const q = API_TIERS[tier].monthlyQuota;
  return q !== null && used >= q;
}

/** Answers left this month for a tier, or `null` when uncapped. Never negative. */
export function remainingThisMonth(used: number, tier: ApiTier): number | null {
  const q = API_TIERS[tier].monthlyQuota;
  return q === null ? null : Math.max(0, q - used);
}
