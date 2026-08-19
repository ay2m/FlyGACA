import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/Alert';
import { Disclaimer } from '@/components/Disclaimer';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { StatusPill } from '@/components/StatusPill';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SubscriptionPanel } from '@/components/account/SubscriptionPanel';
import { refreshAccount, signOut, useAccount } from '@/lib/services/account';
import { uiPlan } from '@/lib/services/entitlements';
import { isAuthAvailable, resendEmailVerification } from '@/lib/services/auth';
import { useNoindexMeta } from '@/hooks/usePageMeta';
import { AccountSignedOut } from './AccountSignedOut';
import account from './account.module.css';
import styles from './AccountPage.module.css';

/** Banner prompting an unverified user to resend their verification email. */
function VerifyBanner() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    try {
      await resendEmailVerification();
      setSent(true);
    } catch {
      /* ignore — generic to avoid leaking account state */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.verifyBanner} role="status">
      <StatusPill tone="warning">{t('account.emailNotVerified')}</StatusPill>
      {sent ? (
        <span className={styles.verifySent}>{t('account.verificationSent')}</span>
      ) : (
        <button
          type="button"
          className={styles.linkBtn}
          disabled={busy}
          onClick={() => void resend()}
        >
          {t('account.resendVerification')}
        </button>
      )}
    </div>
  );
}

export function Account() {
  const { t } = useTranslation();
  // Session-gated dashboard — keep it out of the index (no SEO value; a thin,
  // login-walled page to a crawler).
  useNoindexMeta(t('meta.account'));
  const { session, uid, emailVerified, profile, entitlement, syncError } = useAccount();
  const plan = uiPlan(entitlement);
  const [params, setParams] = useSearchParams();
  const checkout = params.get('checkout');

  // After a checkout returns, the entitlement is granted asynchronously by the
  // billing functions — poll a few times so the new plan appears without a reload.
  useEffect(() => {
    if (checkout !== 'success') return;
    void refreshAccount();
    let n = 0;
    const id = window.setInterval(() => {
      void refreshAccount();
      // ~20s of polling — the webhook write can lag the redirect by several seconds.
      if (++n >= 8) window.clearInterval(id);
    }, 2500);
    return () => window.clearInterval(id);
  }, [checkout]);

  if (!session) return <AccountSignedOut />;

  return (
    <section className={`container-narrow ${account.page}`}>
      <Card variant="raised" className={styles.identityCard}>
        <CaptainAvatar size="md" pose="smile" decorative className={styles.identityAvatar} />
        <div>
          <h1>{t('account.title')}</h1>
          <p className={account.sub}>
            {t('account.signedInAs', { name: profile.displayName || profile.email })}
            <span className={account.planBadge} data-plan={plan}>
              {t(`account.plan.${plan}`)}
            </span>
          </p>
        </div>
      </Card>

      {checkout === 'success' && (
        <div className={styles.verifyBanner} role="status">
          <StatusPill tone={plan !== 'free' ? 'success' : 'warning'}>
            {plan !== 'free'
              ? t('account.subscription.checkoutSuccess')
              : t('account.subscription.activating')}
          </StatusPill>
          <button type="button" className={styles.linkBtn} onClick={() => setParams({})}>
            {t('common.close')}
          </button>
        </div>
      )}
      {checkout === 'cancel' && (
        <p className={account.note} role="status">
          {t('account.subscription.checkoutCanceled')}
        </p>
      )}

      {isAuthAvailable() && uid && !emailVerified && <VerifyBanner />}

      <SubscriptionPanel />

      {syncError && (
        <Alert tone="warning" role="status" icon="⚠">
          {t('account.syncError')}
        </Alert>
      )}

      {/* The signed-in home is /dashboard; the daily surfaces (currency, logbook,
          records) live there and in the account nav menu, so this hub stays
          focused on identity, billing and settings. */}
      <div className={account.linkRow}>
        <ButtonLink to="/dashboard" variant="clayPrimary">
          {t('account.dashboard')}
        </ButtonLink>
        <ButtonLink to="/logbook" variant="clay">
          {t('account.logbook')}
        </ButtonLink>
        <ButtonLink to="/tools" variant="clay">
          {t('nav.tools')}
        </ButtonLink>
        <ButtonLink to="/settings" variant="clay">
          {t('account.settings')}
        </ButtonLink>
      </div>
      <div className={account.actions}>
        <Button type="button" variant="clay" onClick={() => signOut()}>
          {t('account.signOut')}
        </Button>
      </div>
      <p className={account.note}>{t('account.localNote')}</p>
      <Disclaimer compact />
    </section>
  );
}
