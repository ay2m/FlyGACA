/** Indicative SAR price of the self-serve B2B Cohort tier (up to 25 seats, one 90-day
 * intake). Source of truth for every page that DISPLAYS it (`/pricing`, `/schools`,
 * `/business/admin`'s Buy Cohort panel).
 *
 * It is NOT the price that gets charged. The server prices every checkout from
 * `PRICE_COHORT` in `server/src/prices.ts`, which has no code default and is read from
 * the deploy environment. `tests/pricing-server-parity.test.ts` pins this constant to
 * `.env.example`, but the deployed Cloud Run revision is the only thing that actually
 * charges a card — change this and you must update that revision too. */
export const COHORT_PRICE_SAR = 12000;

/** Annual-billing savings, as a whole percentage off 12× the monthly price. */
export function annualSavingsPct(monthly: number, annual: number): number {
  if (monthly <= 0) return 0;
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

/** The monthly-equivalent cost of an annual price, rounded. */
export function monthlyEquivalent(annual: number): number {
  return Math.round(annual / 12);
}

/**
 * A SAR amount with thousands grouped, for interpolation into a price string:
 * `12000` → `"12,000"`. The currency word comes from the i18n string, not here,
 * because it flips sides between `SAR {{n}}` and `{{n}} ريال`.
 *
 * Pinned to `en-US` on purpose: the copy bundles use Western digits in both
 * languages, so the group separator has to match rather than follow the reader's
 * OS locale. Callers render it inside a `<bdi dir="ltr">` so the separator can't
 * reorder under RTL.
 *
 * One helper rather than a `toLocaleString` at each call site — the four-figure
 * prices were grouped on `/pricing` and ungrouped on `/schools` and the cohort
 * checkout button, which is exactly what duplicating the call produced.
 */
export function formatSar(amount: number): string {
  return amount.toLocaleString('en-US');
}
