import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@/lib/services/account';
import { uiPlan } from '@/lib/services/entitlements';
import { cancelAutoRenew } from '@/lib/services/billing';
import { isAuthAvailable } from '@/lib/services/auth';
import { StatusPill } from '@/components/StatusPill';
import { Alert } from '@/components/Alert';
import styles from './SubscriptionPanel.module.css';

function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Subscription status + management. Shows the active plan and renewal date; a
 * genuine Moyasar-billed plan gets a "turn off auto-renew" action (Moyasar has no
 * hosted billing portal — the token-renewal engine just stops recharging, and the
 * plan stays active until its already-granted expiry). Free users get an upgrade
 * prompt. Entitlement is read-only here — the server grants it.
 */
export function SubscriptionPanel() {
  const { t } = useTranslation();
  const { entitlement } = useAccount();
  const plan = uiPlan(entitlement);
  const isPaid = plan !== 'free';
  // Auto-renew only applies to a genuine Moyasar-billed plan — a complimentary/
  // promo/staff/school grant has no card on file to stop charging. Gate on the
  // real record (not the presentational `plan`) so those grants never render a
  // button with nothing behind it.
  const hasMoyasarSub = entitlement?.source === 'moyasar';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [autoRenewOff, setAutoRenewOff] = useState(false);

  async function turnOffAutoRenew() {
    setBusy(true);
    setError('');
    try {
      await cancelAutoRenew();
      setAutoRenewOff(true);
    } catch (e) {
      const code = (e as Error).message;
      setError(t(`account.subscription.errors.${code}`, t('account.subscription.errors.generic')));
      setBusy(false);
    }
  }

  const renews = fmtDate(entitlement?.expiresAt);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('account.subscription.title')}</h2>
        <StatusPill tone={isPaid ? 'success' : 'data'}>{t(`account.plan.${plan}`)}</StatusPill>
      </div>

      {isPaid ? (
        <>
          <dl className={styles.meta}>
            {renews && (
              <div className={styles.row}>
                <dt>{t('account.subscription.renews')}</dt>
                <dd>
                  <bdi dir="ltr">{renews}</bdi>
                </dd>
              </div>
            )}
            {entitlement?.source && (
              <div className={styles.row}>
                <dt>{t('account.subscription.source')}</dt>
                <dd>{entitlement.source}</dd>
              </div>
            )}
          </dl>
          <div className={styles.perks}>
            <span className={styles.perkChip}>✓ {t('account.benefits.pilot')}</span>
            <span className={styles.perkChip}>✓ {t('account.benefits.student')}</span>
            <span className={styles.perkChip}>✓ {t('account.benefits.instructor')}</span>
          </div>
          {isAuthAvailable() &&
            hasMoyasarSub &&
            (autoRenewOff ? (
              <p className={styles.free}>{t('account.subscription.autoRenewOff')}</p>
            ) : (
              <button
                type="button"
                className={styles.manage}
                disabled={busy}
                onClick={() => void turnOffAutoRenew()}
              >
                {t('account.subscription.turnOffAutoRenew')}
              </button>
            ))}
        </>
      ) : (
        <>
          <p className={styles.free}>{t('account.subscription.none')}</p>
          <div className={styles.perks}>
            <span className={styles.perkChip}>{t('account.roles.pilot')}</span>
            <span className={styles.perkChip}>{t('account.roles.student')}</span>
            <span className={styles.perkChip}>{t('account.roles.instructor')}</span>
          </div>
          <Link to="/pricing" className={styles.upgrade}>
            {t('common.goPro')}
          </Link>
        </>
      )}

      {error && (
        <Alert tone="error" role="alert" icon="⚠">
          {error}
        </Alert>
      )}
    </section>
  );
}
