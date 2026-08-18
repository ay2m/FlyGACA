/**
 * Billing. Web checkout navigates to the in-app `/checkout` route, which mounts
 * Moyasar's hosted JS widget (see src/pages/checkout/Checkout.tsx) — card data
 * never touches this app's own servers, only Moyasar's. Native iOS uses RevenueCat
 * IAP (App Store rules forbid web checkout in-app). Mirrors the `billingChannel()`
 * split and is gated on backend config so it no-ops in the local-first build.
 *
 * Errors are thrown as stable codes the UI maps to copy:
 *   'billing-unavailable' · 'sign-in-required' · 'native-billing'
 */
import { billingChannel, isNative } from '@/lib/native/nativeBridge';
import { isBackendConfigured, apiFetch } from '@/lib/services/backend';
import { getCurrentUser } from '@/lib/services/auth';

// 'monthly' / 'annual' are the standard Pro cadences; 'student' is the verified
// student rate and 'pass' the 90-day Exam Season Pass. 'credits' is a one-time
// Captain Adel question pack. The checkout page maps each variant to a Moyasar
// checkout kind — 'pro' (subsuming monthly/annual) for the cadence variants,
// unchanged for the rest — and a cadence for the recurring ones.
export type ProPlan = 'monthly' | 'annual' | 'student' | 'pass' | 'credits';

/** Questions per purchased credit pack. Mirror of server/src/chat-quota-core.ts. */
export const CREDIT_PACK_SIZE = 50;

/** Whether the web Moyasar checkout can run in this runtime. */
export function canCheckout(): boolean {
  return isBackendConfigured() && !isNative();
}

/** Shared guards for every billing entry point: native routes to store IAP,
 * everything else requires a configured + signed-in web session. */
async function requireCheckoutReady(): Promise<void> {
  if (billingChannel() === 'revenuecat' || isNative()) {
    // RevenueCat IAP is wired in the native shell (Batch: native IAP).
    throw new Error('native-billing');
  }
  if (!isBackendConfigured()) throw new Error('billing-unavailable');

  if (!(await getCurrentUser())) throw new Error('sign-in-required');
}

/**
 * Begin Pro (or the discounted student rate / Exam Season Pass / a credit pack)
 * checkout. On web: requires a signed-in user, then navigates to `/checkout` with
 * the kind/cadence/ref carried as query params — the checkout page fetches the
 * actual price server-side (createCheckoutConfig) before mounting the widget. On
 * native: IAP is handled by RevenueCat in the shell, so this throws
 * `native-billing` for the caller to route into the native flow.
 */
export async function startProCheckout(
  plan: ProPlan = 'annual',
  opts?: { annual?: boolean; ref?: string; promo?: string },
): Promise<void> {
  await requireCheckoutReady();
  const kind = plan === 'monthly' || plan === 'annual' ? 'pro' : plan;
  const cadence =
    kind === 'pro' ? plan : kind === 'student' ? (opts?.annual ? 'annual' : 'monthly') : undefined;
  const qs = new URLSearchParams({ kind });
  if (cadence) qs.set('cadence', cadence);
  if (opts?.ref) qs.set('ref', opts.ref);
  if (opts?.promo) qs.set('promo', opts.promo);
  window.location.assign(`/checkout?${qs.toString()}`);
}

/**
 * Begin a one-time exam-prep pack purchase. Same guards + flow as
 * {@link startProCheckout} (web-only; native routes through store IAP), navigating
 * to `/checkout` with the pack id the server re-validates against the sellable list.
 */
export async function startPackCheckout(
  packId: string,
  opts?: { ref?: string; promo?: string },
): Promise<void> {
  await requireCheckoutReady();
  const qs = new URLSearchParams({ kind: 'pack', packId });
  if (opts?.ref) qs.set('ref', opts.ref);
  if (opts?.promo) qs.set('promo', opts.promo);
  window.location.assign(`/checkout?${qs.toString()}`);
}

/**
 * Begin an All-Access Exam Bundle purchase — one payment that permanently unlocks
 * every exam-prep pack. Same guards + flow as {@link startPackCheckout} (web-only;
 * native routes through store IAP); the server prices and fulfils the `bundle` kind.
 */
export async function startBundleCheckout(opts?: { ref?: string; promo?: string }): Promise<void> {
  await requireCheckoutReady();
  const qs = new URLSearchParams({ kind: 'bundle' });
  if (opts?.ref) qs.set('ref', opts.ref);
  if (opts?.promo) qs.set('promo', opts.promo);
  window.location.assign(`/checkout?${qs.toString()}`);
}

/**
 * Begin a self-serve B2B Cohort purchase — one payment creates a 25-seat, 90-day-intake
 * org (docs/b2b/PLAN.md §5 "Starter — Cohort") with the buyer as sole owner, who lands
 * on `/business/admin` able to invite seats immediately. Same guards + flow as
 * {@link startBundleCheckout} (web-only; native has no B2B IAP surface, so it also
 * throws `native-billing` — a B2B buyer completes on web). `orgName` is required and
 * re-validated server-side.
 */
export async function startCohortCheckout(
  orgName: string,
  opts?: { ref?: string; promo?: string },
): Promise<void> {
  await requireCheckoutReady();
  const qs = new URLSearchParams({ kind: 'cohort', orgName });
  if (opts?.ref) qs.set('ref', opts.ref);
  if (opts?.promo) qs.set('promo', opts.promo);
  window.location.assign(`/checkout?${qs.toString()}`);
}

/**
 * Turn off the auto-renewal engine for a Pro/student subscriber — Moyasar has no
 * hosted billing portal, so "manage subscription" is this route plus the
 * account page's own renewal/card-on-file display. The plan stays active until its
 * already-granted `expiresAt`; it just won't be recharged. Throws the same stable
 * error codes as {@link startProCheckout}.
 */
export async function cancelAutoRenew(): Promise<void> {
  await requireCheckoutReady();
  await apiFetch<{ ok?: boolean }>('/billing/cancel-auto-renew', { method: 'POST' });
}
