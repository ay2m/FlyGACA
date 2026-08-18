import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { UpsellCard } from '@/components/UpsellCard';
import { canCheckout, startProCheckout, CREDIT_PACK_SIZE } from '@/lib/services/billing';
import styles from './ChatGate.module.css';

/**
 * The panel that replaces the composer once the daily allowance is spent: an
 * upsell + buy-credits path for a signed-in free account, a sign-in nudge for
 * an anonymous visitor (who has no account to bill). UI nudge only — the
 * server enforces the real quota.
 */
export function ChatGate({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();

  // Buy a one-time question pack (checkout redirects on success; a signed-in chat
  // user won't hit 'sign-in-required', and offline/unconfigured errors are inert).
  async function buyCredits(): Promise<void> {
    try {
      await startProCheckout('credits');
    } catch {
      /* redirected on success; ignore */
    }
  }

  return signedIn ? (
    <div className={styles.gate}>
      <p className={styles.gateNote}>{t('chat.quota.exhausted')}</p>
      <UpsellCard variant="inline" />
      {canCheckout() && (
        <button type="button" className="btn" onClick={() => void buyCredits()}>
          {t('chat.quota.buyCredits', { n: CREDIT_PACK_SIZE })}
        </button>
      )}
    </div>
  ) : (
    // Anonymous trial spent — nudge to sign in for more (no account to bill).
    <div className={styles.gate}>
      <p className={styles.gateNote}>{t('chat.signInRequired')}</p>
      <Link className="btn btn-primary" to="/account">
        {t('account.goSignIn')}
      </Link>
    </div>
  );
}
