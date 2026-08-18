import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { offlineSupported } from '@/lib/native/offlineCache';
import type { useBookmarkGate } from '@/hooks/useBookmarkGate';
import type { LibraryKind } from '@/lib/content';
import styles from './Document.module.css';

/** Reader toolbar: find-in-page · font size · bookmark · offline · share · ask Adel. */
export function ReaderToolbar({
  find,
  onFindChange,
  matchCount,
  activeMatch,
  onCycle,
  onSmaller,
  onLarger,
  canSmaller,
  canLarger,
  docTitle,
  kind,
  slug,
  docBookmarked,
  bookmark,
  saved,
  canOffline,
  onToggleSave,
  onShare,
  adel,
}: {
  find: string;
  onFindChange: (v: string) => void;
  matchCount: number;
  activeMatch: number;
  onCycle: (delta: number) => void;
  onSmaller: () => void;
  onLarger: () => void;
  canSmaller: boolean;
  canLarger: boolean;
  docTitle?: string;
  kind: LibraryKind;
  slug?: string;
  docBookmarked: boolean;
  bookmark: ReturnType<typeof useBookmarkGate>;
  saved: boolean;
  canOffline: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  adel: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <div className={styles.find} role="search">
        <input
          className={styles.findInput}
          type="search"
          value={find}
          onChange={(e) => onFindChange(e.target.value)}
          placeholder={t('document.findPlaceholder')}
          aria-label={t('document.findPlaceholder')}
        />
        {find.trim() && (
          <>
            <span className={styles.findCount} aria-live="polite">
              {matchCount
                ? t('document.findCount', { n: activeMatch + 1, total: matchCount })
                : '0'}
            </span>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onCycle(-1)}
              disabled={matchCount === 0}
              aria-label={t('document.findPrev')}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onCycle(1)}
              disabled={matchCount === 0}
              aria-label={t('document.findNext')}
            >
              ↓
            </button>
          </>
        )}
      </div>

      <div className={styles.toolGroup}>
        <div className={styles.fontControls} role="group" aria-label={t('document.fontSize')}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onSmaller}
            disabled={!canSmaller}
            aria-label={t('document.fontSmaller')}
          >
            A−
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onLarger}
            disabled={!canLarger}
            aria-label={t('document.fontLarger')}
          >
            A+
          </button>
        </div>
        {docTitle && (
          <button
            type="button"
            className={`${styles.toolPill} ${docBookmarked ? styles.toolPillOn : ''}`}
            aria-pressed={docBookmarked}
            title={
              !docBookmarked && !bookmark.canBookmark ? t('library.bookmarkProLock') : undefined
            }
            onClick={() =>
              bookmark.toggle({ kind, slug: slug as string, title: docTitle }, docBookmarked)
            }
          >
            {docBookmarked ? `★ ${t('library.bookmarked')}` : `☆ ${t('library.bookmark')}`}
            {!docBookmarked && !bookmark.canBookmark && (
              <span className={styles.proTag}>{t('upsell.proOnly')}</span>
            )}
          </button>
        )}
        {offlineSupported() && (
          <button
            type="button"
            className={`${styles.toolPill} ${saved ? styles.toolPillOn : ''}`}
            aria-pressed={saved}
            title={!saved && !canOffline ? t('offline.proLock') : undefined}
            onClick={onToggleSave}
          >
            {saved ? `✓ ${t('offline.saved')}` : `⬇ ${t('offline.save')}`}
            {!saved && !canOffline && <span className={styles.proTag}>{t('upsell.proOnly')}</span>}
          </button>
        )}
        <button type="button" className={styles.toolPill} onClick={onShare}>
          ↗ {t('common.share')}
        </button>
        {adel && (
          <Link to={adel} className={styles.askAdel}>
            {t('document.askAdel')}
          </Link>
        )}
      </div>
    </div>
  );
}
