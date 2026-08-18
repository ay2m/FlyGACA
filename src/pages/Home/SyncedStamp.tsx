import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SyncedStamp.module.css';

/**
 * A small "synced N min ago with GACA" trust cue with a pulsing live dot,
 * lifted from the landing comp. The minute counter ticks up while the page is
 * open so the surface feels current. Purely illustrative of the freshness
 * promise — it does not assert a real sync time.
 */
export function SyncedStamp() {
  const { t } = useTranslation();
  const [mins, setMins] = useState(2);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setMins(2 + Math.floor((Date.now() - started) / 60_000));
    }, 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className={styles.stamp}>
      <span className={styles.dot} aria-hidden="true" />
      {t('home.synced', { mins })}
    </p>
  );
}
