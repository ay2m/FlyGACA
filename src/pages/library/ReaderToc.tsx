import { useTranslation } from 'react-i18next';
import type { tocFromHtml } from '@/hooks/useFetchText';
import { isBookmarked, type useLibraryPrefs } from '@/lib/prefs/libraryPrefs';
import type { useBookmarkGate } from '@/hooks/useBookmarkGate';
import type { LibraryKind } from '@/lib/content';
import styles from './Document.module.css';

/** Filterable table of contents with per-section bookmark and copy-link actions. */
export function ReaderToc({
  open,
  onNavigate,
  filter,
  onFilterChange,
  entries,
  activeId,
  kind,
  slug,
  docTitle,
  prefs,
  bookmark,
  copiedId,
  onCopyLink,
}: {
  open: boolean;
  /** Called when an entry is chosen (collapses the mobile TOC). */
  onNavigate: () => void;
  filter: string;
  onFilterChange: (v: string) => void;
  entries: ReturnType<typeof tocFromHtml>;
  activeId: string;
  kind: LibraryKind;
  slug?: string;
  docTitle?: string;
  prefs: ReturnType<typeof useLibraryPrefs>;
  bookmark: ReturnType<typeof useBookmarkGate>;
  copiedId: string;
  onCopyLink: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className={`${styles.toc} ${open ? styles.tocOpen : ''}`} aria-label={t('document.toc')}>
      <input
        className={styles.tocFilter}
        type="search"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder={t('document.filterToc')}
        aria-label={t('document.filterToc')}
      />
      <ul>
        {entries.map((e) => (
          <li key={e.id} className={styles.tocRow}>
            <a
              href={`#${e.id}`}
              className={activeId === e.id ? styles.tocActive : undefined}
              aria-current={activeId === e.id ? 'location' : undefined}
              onClick={() => {
                onNavigate();
                setTimeout(
                  () =>
                    document
                      .getElementById(e.id)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                  0,
                );
              }}
            >
              {e.title}
            </a>
            <button
              type="button"
              className={`${styles.tocStar} ${
                slug && isBookmarked(prefs, kind, slug, e.id) ? styles.tocStarOn : ''
              }`}
              aria-pressed={!!slug && isBookmarked(prefs, kind, slug, e.id)}
              aria-label={t('library.bookmarkSection')}
              title={t('library.bookmarkSection')}
              onClick={() =>
                bookmark.toggle(
                  {
                    kind,
                    slug: slug as string,
                    title: docTitle ?? e.title,
                    anchor: e.id,
                    anchorText: e.title,
                  },
                  !!slug && isBookmarked(prefs, kind, slug, e.id),
                )
              }
            >
              {slug && isBookmarked(prefs, kind, slug, e.id) ? '★' : '☆'}
            </button>
            <button
              type="button"
              className={styles.tocCopy}
              aria-label={t('document.copyLink')}
              title={copiedId === e.id ? t('document.copied') : t('document.copyLink')}
              onClick={() => onCopyLink(e.id)}
            >
              {copiedId === e.id ? '✓' : '⧉'}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
