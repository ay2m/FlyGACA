import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clearAll,
  loadSaved,
  offlineSupported,
  saveDocs,
  storageEstimate,
} from '@/lib/native/offlineCache';
import { CORPUS, loadJson, type CorpusIndex } from '@/lib/content';
import { formatBytes } from '@/calc/library/offlineManifest';
import { ProgressRing } from '@/components/ProgressRing';
import styles from './OfflineDownloads.module.css';

/**
 * "Saved for offline" panel for the Library index: a one-tap action to make the
 * whole GACAR Part library available offline, plus a summary of what's saved
 * (count + on-device storage) and a remove-all. Renders nothing when the Cache
 * API is unavailable (e.g. non-secure context / unsupported browser).
 */
export function OfflineDownloads() {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<string[]>([]);
  const [bytes, setBytes] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState(false);

  function refresh() {
    setSaved(loadSaved());
    void storageEstimate().then(setBytes);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (offlineSupported()) refresh();
  }, []);

  if (!offlineSupported()) return null;

  async function saveCore() {
    setDone(false);
    setProgress({ done: 0, total: 0 });
    try {
      // Cache every GACAR Part: its HTML plus the shared regulations index.
      const index = await loadJson<CorpusIndex>(CORPUS.regulations.index);
      const items = index.documents.map((d) => ({
        slug: d.slug,
        urls: [`${CORPUS.regulations.dir}/${d.slug}.html`, CORPUS.regulations.index],
      }));
      await saveDocs(items, (n, total) => setProgress({ done: n, total }));
      setDone(true);
    } finally {
      setProgress(null);
      refresh();
    }
  }

  const busy = progress !== null;

  return (
    <div className={styles.panel}>
      <div className={styles.info}>
        <span className={styles.title}>{t('offline.downloads')}</span>
        <span className={styles.meta} aria-live="polite">
          {saved.length > 0 ? (
            <>
              {t('offline.count', { n: saved.length })}
              {bytes > 0 && ` · ${t('offline.size', { size: formatBytes(bytes) })}`}
            </>
          ) : (
            done && t('offline.coreSaved')
          )}
        </span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.save}
          onClick={() => void saveCore()}
          disabled={busy}
        >
          {progress ? (
            <>
              <ProgressRing value={progress.total ? progress.done / progress.total : 0} size={18} />
              {t('offline.saving', { done: progress.done, total: progress.total })}
            </>
          ) : (
            t('offline.saveCore')
          )}
        </button>
        {saved.length > 0 && (
          <button
            type="button"
            className={styles.remove}
            disabled={busy}
            onClick={() => {
              void clearAll().then(() => {
                setSaved([]);
                setBytes(0);
                setDone(false);
              });
            }}
          >
            {t('offline.removeAll')}
          </button>
        )}
      </div>
    </div>
  );
}
