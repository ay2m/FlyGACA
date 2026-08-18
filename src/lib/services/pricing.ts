/** Indicative SAR price of the self-serve B2B Cohort tier (up to 25 seats, one 90-day
 * intake — docs/b2b/PLAN.md §5 "Starter — Cohort"). One source of truth for every page
 * that shows or charges it (`/pricing`, `/schools`, `/business/admin`'s Buy Cohort
 * panel); mirror `MOYASAR_PRICE_COHORT_SAR` (functions/src/billing.ts) if it changes —
 * see docs/BILLING.md. */
export const COHORT_PRICE_SAR = 6000;

/** Annual-billing savings, as a whole percentage off 12× the monthly price. */
export function annualSavingsPct(monthly: number, annual: number): number {
  if (monthly <= 0) return 0;
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

/** The monthly-equivalent cost of an annual price, rounded. */
export function monthlyEquivalent(annual: number): number {
  return Math.round(annual / 12);
}
