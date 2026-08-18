import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLibraryPrefs, type LibBookmark, type LibraryKind } from '@/lib/prefs/libraryPrefs';
import { useGuidePrefs } from '@/lib/prefs/guidePrefs';
import { LIVE_GUIDE_SLUGS } from '@/pages/guides/guides';
import styles from './dashboard-widgets.module.css';

const MAX_ROWS = 5;

/** Route for a library bookmark, mirroring the router's kind → path mapping. */
function libraryRoute(b: LibBookmark): string {
  const base: Record<LibraryKind, string> = {
    regulations: `/library/${b.slug}`,
    reference: `/library/reference/${b.slug}`,
    handbook: `/library/handbook/${b.slug}`,
  };
  return base[b.kind] + (b.anchor ? `#${b.anchor}` : '');
}

/**
 * "Continue reading": the most recent library bookmarks (section-level when
 * anchored) and bookmarked guides, mixed, newest additions last in storage so
 * we take from the end.
 */
export function BookmarksWidget() {
  const { t } = useTranslation();
  const { bookmarks } = useLibraryPrefs();
  const { bookmarks: guideBookmarks } = useGuidePrefs();

  const libRows = bookmarks.slice(-MAX_ROWS).reverse();
  const guideRows = (LIVE_GUIDE_SLUGS as readonly string[])
    .filter((slug) => guideBookmarks.includes(slug))
    .slice(0, Math.max(0, MAX_ROWS - libRows.length));
  const total = libRows.length + guideRows.length;

  return (
    <>
      <div className={styles.head}>
        <h2>{t('dashboard.widgets.bookmarks.title')}</h2>
        <Link to="/library" className={styles.headLink}>
          {t('dashboard.widgets.bookmarks.open')}
        </Link>
      </div>
      {total > 0 ? (
        <ul className={styles.rowList}>
          {libRows.map((b) => (
            <li key={`${b.kind}:${b.slug}:${b.anchor ?? ''}`}>
              <Link to={libraryRoute(b)} className={styles.rowLink}>
                <span className={styles.rowTitle}>{b.anchorText || b.title}</span>
                <span className={styles.rowMeta}>{t('dashboard.widgets.bookmarks.library')}</span>
              </Link>
            </li>
          ))}
          {guideRows.map((slug) => (
            <li key={`guide:${slug}`}>
              <Link to={`/guides/${slug}`} className={styles.rowLink}>
                <span className={styles.rowTitle}>{t(`guides.items.${slug}.name`)}</span>
                <span className={styles.rowMeta}>{t('dashboard.widgets.bookmarks.guides')}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          {t('dashboard.widgets.bookmarks.empty')}{' '}
          <Link to="/library" className={styles.emptyCta}>
            {t('dashboard.widgets.bookmarks.open')}
          </Link>
        </p>
      )}
    </>
  );
}
