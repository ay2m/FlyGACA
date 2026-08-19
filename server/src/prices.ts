/**
 * The SAR price table, read from the environment.
 *
 * Prices live in config rather than code so a change is a Cloud Run revision, not
 * a deploy — the same reason they were Firebase params before. `sarToHalalas`
 * throws on a missing or non-positive value, so a half-configured revision fails
 * loudly at checkout instead of silently charging SAR 0.
 */
import type { PriceEnv } from "./billing-core.js";

export function priceEnv(): PriceEnv {
  return {
    proMonthly: process.env.PRICE_PRO_MONTHLY ?? "",
    proAnnual: process.env.PRICE_PRO_ANNUAL ?? "",
    pass: process.env.PRICE_PASS ?? "",
    credits: process.env.PRICE_CREDITS ?? "",
    prepPack: process.env.PRICE_PREP_PACK ?? "",
    prepPackEssential: process.env.PRICE_PREP_PACK_ESSENTIAL ?? "",
    prepPackStandard: process.env.PRICE_PREP_PACK_STANDARD ?? "",
    prepPackComplete: process.env.PRICE_PREP_PACK_COMPLETE ?? "",
    bundle: process.env.PRICE_BUNDLE ?? "",
    cohort: process.env.PRICE_COHORT ?? "",
  };
}
