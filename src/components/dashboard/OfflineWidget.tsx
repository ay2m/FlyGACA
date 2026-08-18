import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/StatusPill';
import { loadSaved } from '@/lib/native/offlineCache';
import { useAccount } from '@/lib/services/account';
import styles from './dashboard-widgets.module.css';

/**
 * Offline & sync health: how many regulations are cached for offline reading
 * (from the `flygaca:offline:saved` manifest) and whether the last Firestore
 * write-through succeeded (the account `syncError` flag). The library page owns
 * the saved manifest, so we read it once on mount; `syncError` is reactive
 * through the account store.
 */
export function OfflineWidget() {
  const { t } = useTranslation();
  const [savedCount] = useState(() => loadSaved().length);
  const { syncError } = useAccount();

  return (
    <>
      <div className={styles.head}>
        <h2>{t('dashboard.widgets.offline.title')}</h2>
        <Link to="/library" className={styles.headLink}>
          {t('dashboard.widgets.offline.manage')}
        </Link>
      </div>
      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('dashboard.widgets.offline.savedLabel')}</span>
          <span className={styles.statValue} data-dim={savedCount === 0 ? 'true' : undefined}>
            {savedCount}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('dashboard.widgets.offline.syncLabel')}</span>
          <StatusPill tone={syncError ? 'warning' : 'success'} role="status">
            {t(
              syncError ? 'dashboard.widgets.offline.syncOff' : 'dashboard.widgets.offline.syncOn',
            )}
          </StatusPill>
        </div>
      </div>
      {savedCount === 0 && (
        <p className={styles.empty}>
          {t('dashboard.widgets.offline.empty')}{' '}
          <Link to="/library" className={styles.emptyCta}>
            {t('dashboard.widgets.offline.manage')}
          </Link>
        </p>
      )}
    </>
  );
}
