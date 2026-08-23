import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { canCheckout, startPackCheckout } from '@/lib/services/billing';
import { getStoredRef } from '@/lib/services/referral';
import { getStoredPromo } from '@/lib/services/promo';
import { Disclaimer } from '@/components/Disclaimer';
import { packItemCount, packPrice, type Pack } from '@/lib/prepCatalog';
import type { QuizData } from '@/lib/content';
import styles from './Study.module.css';

/** The locked pack storefront: what's inside, price, Buy (web) / IAP note. */
export function PackStorefront({ pack, questionCount }: { pack: Pack; questionCount: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const packName = t(`study.packCatalog.${pack.id}.name`);
  const packDesc = t(`study.packCatalog.${pack.id}.desc`);
  const pack2 = pack;

  async function buy() {
    setBusy(true);
    setError('');
    try {
      await startPackCheckout(pack2.id, { ref: getStoredRef(), promo: getStoredPromo() });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'sign-in-required') {
        navigate('/account');
        return;
      }
      setError(t('study.packCheckoutError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/study/packs">← {t('study.packs')}</Link>
      </p>
      <header className={styles.packHero}>
        <div className={styles.packHeroTop}>
          <h1>{packName}</h1>
          <span className={styles.proTag}>{t('study.packPaid')}</span>
        </div>
        <p className={styles.packHeroDesc}>{packDesc}</p>

        <p className={styles.packInsideLine}>
          {t('study.packItemCount', { n: packItemCount(pack2) })} ·{' '}
          {t('study.questions', { n: questionCount })}
        </p>

        <div className={styles.packBuyRow}>
          <span className={styles.packBuyPrice}>
            <bdi dir="ltr">{t('study.packPriceOnce', { n: packPrice(pack2) })}</bdi>
          </span>
          {canCheckout() ? (
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => void buy()}
            >
              {busy ? t('pricing.checkoutBusy') : t('study.packBuy')}
            </button>
          ) : (
            // Native shells buy through store IAP, not Moyasar web checkout.
            <button type="button" className={styles.primary} disabled aria-disabled="true">
              {t('pricing.passComingSoon')}
            </button>
          )}
        </div>
        <p className={styles.packIncludedWith}>
          <Link to="/pricing">{t('study.packIncludedWithPro')}</Link>
        </p>
        {error && (
          <p role="alert" className={styles.notifyError}>
            {error}
          </p>
        )}
      </header>
      <Disclaimer compact />
    </section>
  );
}

/** Total questions across a pack's banks — for the locked page's "what's inside". */
// eslint-disable-next-line react-refresh/only-export-components
export function countQuestions(data: QuizData | null | undefined, bankIds: string[]): number {
  if (!data) return 0;
  return bankIds.reduce(
    (n, id) => n + (data.banks.find((b) => b.id === id)?.questions.length ?? 0),
    0,
  );
}
