import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useFeature } from '@/lib/services/features';
import { useUpdatesPrefs } from '@/lib/prefs/updatesPrefs';
import {
  airacStatus,
  mergeSources,
  watchedChanges,
  type Airac,
  type SourceEntry,
  type SourceStatus,
} from '@/calc/library/changeTracking';
import styles from './dashboard-widgets.module.css';

interface SourcesFile {
  sources: SourceEntry[];
}
interface StatusFile {
  airac?: Airac;
  sources: SourceStatus[];
}

/**
 * Regulatory-watch telemetry: AIRAC cycle countdown (public), watched-source
 * count, and — Pro only, mirroring the Updates page gate — how many watched
 * sources changed since the last visit.
 */
export function UpdatesWatchWidget() {
  const { t } = useTranslation();
  const isPro = useFeature('change-alerts');
  const prefs = useUpdatesPrefs();
  const src = useFetchJson<SourcesFile>('/data/sources.json');
  const status = useFetchJson<StatusFile>('/data/source-status.json');

  const merged = useMemo(
    () => mergeSources(src.data?.sources ?? [], status.data?.sources ?? [], prefs.seen),
    [src.data, status.data, prefs.seen],
  );
  const changed = watchedChanges(merged, prefs.watch).length;
  const airac = airacStatus(status.data?.airac);

  return (
    <>
      <div className={styles.head}>
        <h2>{t('dashboard.widgets.updates.title')}</h2>
        <Link to="/updates" className={styles.headLink}>
          {t('dashboard.widgets.updates.open')}
        </Link>
      </div>
      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('dashboard.widgets.updates.watching')}</span>
          <span className={styles.statValue}>
            <bdi dir="ltr">{prefs.watch.length}</bdi>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            {t('dashboard.widgets.updates.changed')}
            {!isPro && <span className={styles.proTag}>{t('upsell.proOnly')}</span>}
          </span>
          {isPro ? (
            <span className={`${styles.statValue} ${changed > 0 ? styles.statWarn : ''}`}>
              <bdi dir="ltr">{changed}</bdi>
            </span>
          ) : (
            <span className={styles.statValue} data-dim="true">
              —
            </span>
          )}
        </div>
      </div>
      {airac && (
        <p className={styles.empty}>
          <bdi dir="ltr">{airac.next}</bdi> ·{' '}
          {t('dashboard.widgets.updates.airacNext', { days: airac.daysToNext })}
        </p>
      )}
    </>
  );
}
