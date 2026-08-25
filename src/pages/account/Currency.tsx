import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { CurrencyBoard } from '@/components/CurrencyBoard';
import { UpsellCard } from '@/components/UpsellCard';
import { Disclaimer } from '@/components/Disclaimer';
import { useAccount } from '@/lib/services/account';
import { uiIsPro } from '@/lib/services/entitlements';
import { useNoindexMeta } from '@/hooks/usePageMeta';
import { computeCurrency, recordCurrency } from '@/calc/pilot/currency';
import { buildIcs } from '@/calc/pilot/ics';
import { adelLink } from '@/lib/adel';
import styles from './account.module.css';
import { triggerDownload } from '@/lib/download';

export function Currency() {
  const { t } = useTranslation();
  // Session-gated — keep out of the index.
  useNoindexMeta(t('meta.currency'));
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, flights, records, entitlement } = useAccount();
  const isPro = uiIsPro(entitlement);
  const items = [...computeCurrency(profile, flights), ...recordCurrency(records)];
  const adelHref = adelLink(t('dashboard.adelRenewalPrompt'));

  const icsEvents = items
    .filter((i) => i.expiry)
    .map((i) => ({ summary: t(i.labelKey), date: i.expiry as Date }));

  function exportIcs() {
    if (!isPro) {
      navigate('/pricing');
      return;
    }
    triggerDownload('flygaca-currency.ics', buildIcs(icsEvents), 'text/calendar');
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('currency.title')}</h1>
        <p className={styles.sub}>{t('currency.intro')}</p>
      </header>

      <CurrencyBoard items={items} />

      <div className={styles.linkRow}>
        {icsEvents.length > 0 && (
          <button type="button" className={`${styles.btn} btn-clay`} onClick={exportIcs}>
            {t('currency.addCalendar')}
            {!isPro && <span className={styles.proTag}>{t('upsell.proOnly')}</span>}
          </button>
        )}
        <Link to="/settings" className={`${styles.btn} btn-clay`} viewTransition>
          {t('account.settings')}
        </Link>
        <Link to="/logbook" className={`${styles.btn} btn-clay`} viewTransition>
          {t('account.logbook')}
        </Link>
        {adelHref && (
          <Link to={adelHref} className={`${styles.btn} btn-clay-primary`} viewTransition>
            {t('currency.askAdel')}
          </Link>
        )}
      </div>

      {!isPro && <UpsellCard variant="inline" />}

      <Disclaimer compact />
    </section>
  );
}
