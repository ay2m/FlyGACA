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
export type ApiTier = "starter" | "growth" | "scale" | "enterprise";

export interface ApiTierSpec {
  /** Answers included per calendar month; `null` = uncapped (enterprise/custom). */
  monthlyQuota: number | null;
  /** Indicative SAR/month list price; `null` = custom (contact sales). */
  priceSar: number | null;
}

/**
 * Indicative pricing. The ladder steps ~4x in price and ~5x in quota, which is the
 * shape every comparable metered API uses (SerpApi, Algolia, Pinecone) before handing
 * off to "contact sales".
 *
 * A cited answer costs roughly SAR 0.02 to serve on a Flash-class model and SAR 0.09
 * on Pro, so the entry band prices at ~24x cost. The previous quotas (5,000 on starter,
 * 25,000 on growth) were set far too generously against that: 5,000 Pro-model answers
 * alone cost ~SAR 470 against a SAR 499 tier, i.e. a ~6% gross margin. Retiering here
 * leaves headroom to absorb a provider price rise without repricing partners.
 *
 * COST BASIS: those per-answer figures were measured on Gemini, which is the
 * default generation provider (via its OpenAI-compatible endpoint), so the basis
 * holds. If Captain Adel is later moved to an in-Kingdom ALLaM endpoint, re-measure
 * the per-answer cost — the prices are a commercial decision and only the implied
 * margin moves with the provider.
 */
export const API_TIERS: Record<ApiTier, ApiTierSpec> = {
  starter: { monthlyQuota: 1000, priceSar: 499 },
  growth: { monthlyQuota: 5000, priceSar: 1999 },
  scale: { monthlyQuota: 25000, priceSar: 6999 },
  enterprise: { monthlyQuota: null, priceSar: null },
};

/** Narrow untrusted input (a key doc's `tier` field) to a valid tier, defaulting to
 * `enterprise` (uncapped) so a key minted before tiers existed is never throttled. */
export function apiTier(v: unknown): ApiTier {
  return v === "starter" || v === "growth" || v === "scale" || v === "enterprise"
    ? v
    : "enterprise";
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
