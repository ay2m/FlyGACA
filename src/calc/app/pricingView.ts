/**
 * Pure view-logic for the pricing page — the small decisions the page and its
 * checkout hook make, lifted out so they are unit-testable (no DOM/i18n). The
 * page keeps the `t()` templating and JSX; these just classify.
 */

/**
 * What a failed checkout should do, mapped from the thrown error code:
 * `sign-in-required` → route to the account page; `student-verification-required`
 * → show the student-verify notice; anything else → the generic error notice.
 */
export type PricingCheckoutOutcome = 'navigate-account' | 'student-verify' | 'generic';

export function pricingCheckoutOutcome(code: string): PricingCheckoutOutcome {
  if (code === 'sign-in-required') return 'navigate-account';
  if (code === 'student-verification-required') return 'student-verify';
  return 'generic';
}

/** The error string thrown by a checkout call, or '' when it wasn't an Error. */
export function checkoutErrorCode(e: unknown): string {
  return e instanceof Error ? e.message : '';
}

/**
 * How a comparison-table cell should render: a tinted check, a muted cross, or
 * pass-through text (e.g. "5 / day", "Unlimited"). The glyphs are the corpus's
 * own `✓` / `✕` markers.
 */
export function classifyCompareCell(v: string): 'yes' | 'no' | 'text' {
  if (v === '✓') return 'yes';
  if (v === '✕') return 'no';
  return 'text';
}

/**
 * The Pro annual price to charge/show: the founding intro price while the launch
 * window is open, otherwise the list price.
 */
export function foundingAnnualPrice(
  foundingOffer: boolean,
  foundingAnnual: number,
  listAnnual: number,
): number {
  return foundingOffer ? foundingAnnual : listAnnual;
}

/** Whether to show the struck-through list price (only during the founding launch, annual view). */
export function showFoundingStrike(foundingOffer: boolean, annual: boolean): boolean {
  return foundingOffer && annual;
}
