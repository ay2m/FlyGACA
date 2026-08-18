import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useFeature } from '@/lib/services/features';
import { useUpdatesPrefs, markAllSeen, toggleWatch, hasBaseline } from '@/lib/prefs/updatesPrefs';
import {
  airacStatus,
  changedSources,
  mergeSources,
  snapshot,
  trackableSources,
  type Airac,
  type SourceEntry,
  type SourceStatus,
} from '@/calc/library/changeTracking';
import { Disclaimer } from '@/components/Disclaimer';
import { EmptyState } from '@/components/EmptyState';
import { UpsellCard } from '@/components/UpsellCard';
import { Alert } from '@/components/Alert';
import styles from './Updates.module.css';

interface SourcesFile {
  sources: SourceEntry[];
}
interface StatusFile {
  airac?: Airac;
  sources: SourceStatus[];
}

export function Updates() {
  const { t } = useTranslation();
  usePageMeta(t('meta.updates'), t('metaDesc.updates'));
  const isPro = useFeature('change-alerts');
  const prefs = useUpdatesPrefs();
  const src = useFetchJson<SourcesFile>('/data/sources.json');
  const status = useFetchJson<StatusFile>('/data/source-status.json');

  const sources = useMemo(() => src.data?.sources ?? [], [src.data]);
  const statuses = useMemo(() => status.data?.sources ?? [], [status.data]);
  const merged = useMemo(
    () => mergeSources(sources, statuses, prefs.seen),
    [sources, statuses, prefs.seen],
  );
  const changed = changedSources(merged);
  const airac = airacStatus(status.data?.airac);

  // Seed the baseline silently on the first ever visit so the first real change
  // becomes the first alert (rather than flagging the whole corpus as "new").
  useEffect(() => {
    if (sources.length && !hasBaseline(prefs)) markAllSeen(snapshot(sources));
  }, [sources, prefs]);

  const loading = src.loading || status.loading;

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t('alerts.eyebrow')}</p>
        <h1>{t('alerts.title')}</h1>
        <p className={styles.subtitle}>{t('alerts.subtitle')}</p>
      </header>

      {!isPro ? (
        <div className={styles.gate}>
          <p className={styles.gateNote}>{t('alerts.proTeaser')}</p>
          <UpsellCard variant="inline" />
        </div>
      ) : loading ? (
        <p>{t('common.loading')}</p>
      ) : src.error || status.error ? (
        <Alert tone="error" role="alert" icon="⚠">
          {t('common.loadError')}
        </Alert>
      ) : (
        <>
          {airac && (
            <div className={styles.airac}>
              <div className={styles.airacRow}>
                <span className={styles.airacLabel}>{t('alerts.airacCurrent')}</span>
                <span className={styles.airacValue}>{airac.current}</span>
              </div>
              <div className={styles.airacRow}>
                <span className={styles.airacLabel}>{t('alerts.airacNext')}</span>
                <span className={styles.airacValue}>
                  {airac.next}
                  <span className={`${styles.airacDays} ${airac.due ? styles.airacDue : ''}`}>
                    {t('alerts.airacDays', { n: airac.daysToNext })}
                  </span>
                </span>
              </div>
            </div>
          )}

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2>{t('alerts.sinceLastVisit')}</h2>
              {changed.length > 0 && (
                <button
                  type="button"
                  className={styles.markRead}
                  onClick={() => markAllSeen(snapshot(sources))}
                >
                  {t('alerts.markRead')}
                </button>
              )}
            </div>
            {changed.length === 0 ? (
              <EmptyState icon="✓">{t('alerts.empty')}</EmptyState>
            ) : (
              <ul className={styles.list}>
                {changed.map((s) => (
                  <li key={s.id} className={`${styles.row} ${styles.rowChanged}`}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {s.label}
                        <span className={styles.changedDot} aria-label={t('alerts.changed')} />
                      </span>
                      {s.effective && (
                        <span className={styles.rowMeta}>
                          {t('alerts.effective', { date: s.effective })}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2>{t('alerts.watchlist')}</h2>
            </div>
            <p className={styles.watchHint}>{t('alerts.watchHint')}</p>
            <ul className={styles.list}>
              {trackableSources(sources).map((s) => {
                const watching = prefs.watch.includes(s.id);
                return (
                  <li key={s.id} className={styles.row}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{s.label}</span>
                      {s.kind && <span className={styles.rowMeta}>{s.kind}</span>}
                    </span>
                    <button
                      type="button"
                      className={`${styles.watch} ${watching ? styles.watchOn : ''}`}
                      aria-pressed={watching}
                      onClick={() => toggleWatch(s.id)}
                    >
                      {watching ? `★ ${t('alerts.watching')}` : `☆ ${t('alerts.watch')}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <Disclaimer compact />
    </section>
  );
}
