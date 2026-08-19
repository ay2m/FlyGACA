/**
 * The pricing page's checkout orchestration in one hook: the billing-cycle
 * toggle, the Pro/pass and All-Access-bundle checkout calls, the error/busy
 * state, the `?checkout=cancel` acknowledgement, and the caller's current plan.
 * The page keeps only layout + `t()` copy. Error outcomes are reported as a
 * stable kind so the hook stays i18n-free and the page maps it to a message. Pure decisions live in
 * `@/calc/app/pricingView`; the checkout side effects in `@/lib/services/billing`.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { startBundleCheckout, startProCheckout, type ProPlan } from '@/lib/services/billing';
import { useAccount } from '@/lib/services/account';
import { effectivePlan, type Plan } from '@/lib/services/entitlements';
import { captureRefFromUrl, getStoredRef } from '@/lib/services/referral';
import { capturePromoFromUrl, getStoredPromo } from '@/lib/services/promo';
import { checkoutErrorCode, pricingCheckoutOutcome } from '@/calc/app/pricingView';

/** The kind of error notice to show under the plans, or null for none. */
export type PricingErrorKind = 'generic';

export interface PricingCheckout {
  annual: boolean;
  setAnnual: (v: boolean) => void;
  busy: boolean;
  errorKind: PricingErrorKind | null;
  /** True when the user returned from an abandoned/failed checkout. */
  showCanceled: boolean;
  dismissCanceled: () => void;
  /** Start a Pro/pass/credits checkout for the given variant. */
  checkout: (variant: ProPlan) => Promise<void>;
  /** Start the one-time All-Access Exam Bundle checkout. */
  buyBundle: () => Promise<void>;
  /** The caller's honest effective plan (drives the "current plan" badges). */
  plan: Plan;
  /** A paid plan already covers Pro, so its CTA manages the subscription instead. */
  isPaid: boolean;
}

export function usePricingCheckout(): PricingCheckout {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entitlement } = useAccount();
  const plan = effectivePlan(entitlement);

  // Annual is the default — the better LTV/cash outcome and the headline saving.
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorKind, setErrorKind] = useState<PricingErrorKind | null>(null);

  const showCanceled = searchParams.get('checkout') === 'cancel';
  function dismissCanceled() {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  }

  // Persist an inbound ?ref=CODE / ?promo=CODE so each survives the sign-in /
  // checkout round-trip.
  useEffect(() => {
    captureRefFromUrl();
    capturePromoFromUrl();
  }, []);

  async function checkout(variant: ProPlan) {
    setBusy(true);
    setErrorKind(null);
    try {
      await startProCheckout(variant, { annual, ref: getStoredRef(), promo: getStoredPromo() });
    } catch (e) {
      const outcome = pricingCheckoutOutcome(checkoutErrorCode(e));
      if (outcome === 'navigate-account') {
        navigate('/account');
        return;
      }
      setErrorKind(outcome);
    } finally {
      setBusy(false);
    }
  }

  async function buyBundle() {
    setBusy(true);
    setErrorKind(null);
    try {
      await startBundleCheckout({ ref: getStoredRef(), promo: getStoredPromo() });
    } catch (e) {
      // Any non-sign-in failure on the bundle is generic.
      if (pricingCheckoutOutcome(checkoutErrorCode(e)) === 'navigate-account') {
        navigate('/account');
        return;
      }
      setErrorKind('generic');
    } finally {
      setBusy(false);
    }
  }

  return {
    annual,
    setAnnual,
    busy,
    errorKind,
    showCanceled,
    dismissCanceled,
    checkout,
    buyBundle,
    plan,
    isPaid: plan !== 'free',
  };
}
