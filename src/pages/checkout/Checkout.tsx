import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/Alert';
import { Disclaimer } from '@/components/Disclaimer';
import { useNoindexMeta } from '@/hooks/usePageMeta';
import { apiFetch, ApiError } from '@/lib/services/backend';
import { getCurrentUser } from '@/lib/services/auth';
import styles from './Checkout.module.css';

const MOYASAR_JS = 'https://cdn.moyasar.com/mpf/1.16.0/moyasar.js';
const MOYASAR_CSS = 'https://cdn.moyasar.com/mpf/1.16.0/moyasar.css';
const MOYASAR_APPLE_PAY_VALIDATE_URL = 'https://api.moyasar.com/v1/applepay/initiate';
const FORM_ID = 'moyasar-checkout-form';

interface MoyasarGlobal {
  init: (config: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    Moyasar?: MoyasarGlobal;
  }
}

interface CheckoutConfig {
  checkoutId: string;
  amount: number;
  /** Pre-discount amount; equals `amount` when no promo applied. */
  listAmount?: number;
  /** The promo code that discounted `amount`, if any. */
  promoApplied?: string | null;
  currency: string;
  description: string;
  callbackUrl: string;
  methods: string[];
  saveCard: boolean;
  supportedNetworks: string[];
}

/** Load the Moyasar hosted-widget script + stylesheet exactly once, however many
 * times the checkout page mounts. */
let widgetAssets: Promise<void> | null = null;
function loadWidgetAssets(): Promise<void> {
  widgetAssets ??= new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MOYASAR_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MOYASAR_CSS;
      document.head.appendChild(link);
    }
    if (window.Moyasar) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MOYASAR_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('widget-load-failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = MOYASAR_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('widget-load-failed'));
    document.head.appendChild(script);
  });
  return widgetAssets;
}

/**
 * The Moyasar checkout surface — handles BOTH legs of a purchase:
 *  - Start (`?kind=...`): price the checkout server-side (createCheckoutConfig) and
 *    mount Moyasar's hosted JS widget. Card/mada/Apple Pay/STC Pay data goes
 *    straight from the browser to Moyasar — it never touches this app's servers.
 *  - Return (`?id=...`): Moyasar redirected back after payment; confirm it
 *    server-side (confirmPayment) and continue to wherever that purchase belongs.
 */
export function Checkout() {
  const { t, i18n } = useTranslation();
  useNoindexMeta(t('checkout.title'));
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [promoNote, setPromoNote] = useState('');

  const paymentId = params.get('id');
  const kind = params.get('kind');
  const cadence = params.get('cadence') ?? undefined;
  const packId = params.get('packId') ?? undefined;
  const orgName = params.get('orgName') ?? undefined;
  const ref = params.get('ref') ?? undefined;
  const promo = params.get('promo') ?? undefined;

  function fail(err: unknown) {
    setStatus('error');
    const code = err instanceof ApiError ? err.code : err instanceof Error ? err.message : '';
    setError(t(`checkout.errors.${code}`, t('checkout.errors.generic')));
  }

  // Return leg — a payment id means Moyasar just redirected back.
  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ redirectTo?: string }>('/billing/confirm', {
          method: 'POST',
          body: { id: paymentId },
        });
        if (cancelled) return;
        navigate(res.redirectTo ?? '/account?checkout=success', { replace: true });
      } catch (e) {
        if (cancelled) return;
        fail(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  // Start leg — price the checkout and mount the widget.
  useEffect(() => {
    if (paymentId) return;
    if (!kind) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fail('unknown-checkout-kind');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!(await getCurrentUser())) throw new Error('sign-in-required');
        const publishableKey = import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY as string | undefined;
        if (!publishableKey) throw new Error('billing-unavailable');
        const cfg = await apiFetch<CheckoutConfig>('/billing/checkout-config', {
          method: 'POST',
          body: { kind, cadence, packId, orgName, ref, promo },
        });

        // Reassure the buyer a code landed — the widget already shows the discounted
        // `amount`; this names the code and the saving (both amounts are in halalas).
        if (cfg.promoApplied && cfg.listAmount && cfg.listAmount > cfg.amount) {
          setPromoNote(
            t('checkout.promoApplied', {
              code: cfg.promoApplied,
              save: (cfg.listAmount - cfg.amount) / 100,
            }),
          );
        }

        await loadWidgetAssets();
        if (cancelled || !window.Moyasar) return;

        // Carry the kind/packId through Moyasar's redirect so the return leg can
        // tell the confirming route nothing more than "here's the payment id" —
        // the actual kind/amount are re-derived server-side from the stored
        // checkoutIntent, never trusted from this URL.
        const callbackUrl = new URL(cfg.callbackUrl);
        if (kind) callbackUrl.searchParams.set('kind', kind);
        if (packId) callbackUrl.searchParams.set('packId', packId);

        if (formRef.current) formRef.current.innerHTML = '';

        window.Moyasar.init({
          element: `#${FORM_ID}`,
          amount: cfg.amount,
          currency: cfg.currency,
          description: cfg.description,
          publishable_api_key: publishableKey,
          callback_url: callbackUrl.toString(),
          methods: cfg.methods,
          supported_networks: cfg.supportedNetworks,
          save_card: cfg.saveCard,
          metadata: { checkoutId: cfg.checkoutId },
          language: i18n.language?.startsWith('ar') ? 'ar' : 'en',
          ...(cfg.methods.includes('applepay')
            ? {
                apple_pay: {
                  country: 'SA',
                  label: 'Fly GACA',
                  validate_merchant_url: MOYASAR_APPLE_PAY_VALIDATE_URL,
                },
              }
            : {}),
        });
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        fail(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, kind, cadence, packId, orgName, ref, promo, i18n.language]);

  return (
    <section className={`container-narrow ${styles.page}`}>
      <Card variant="raised" className={styles.card}>
        <h1 className={styles.title}>{t('checkout.title')}</h1>

        {error && (
          <Alert tone="error" role="alert" icon="⚠">
            {error}
          </Alert>
        )}

        {paymentId ? (
          <p role="status" className={styles.note}>
            {t('checkout.confirming')}
          </p>
        ) : (
          <>
            {status === 'loading' && (
              <p role="status" className={styles.note}>
                {t('checkout.preparing')}
              </p>
            )}
            {promoNote && (
              <Alert tone="success" icon="🎟">
                {promoNote}
              </Alert>
            )}
            <div id={FORM_ID} ref={formRef} className={styles.form} />
          </>
        )}
      </Card>
      <Disclaimer compact />
    </section>
  );
}
