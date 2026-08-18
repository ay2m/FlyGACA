import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CORPUS } from '@/lib/content';
import type { CorpusDoc, LibraryKind } from '@/lib/content';
import styles from './Library.module.css';
import hub from '@/components/hub/hubList.module.css';

/** One corpus document, as a grid card or a compact list row. */
export function LibraryDocItem({
  d,
  view,
  kind,
  marked,
  onToggleBookmark,
  catColor,
  categoryLabel,
}: {
  d: CorpusDoc;
  view: 'grid' | 'list';
  kind: LibraryKind;
  marked: boolean;
  onToggleBookmark: () => void;
  catColor: (id: string) => string;
  categoryLabel: (id: string) => string;
}) {
  const { t } = useTranslation();
  const meta = d.pages
    ? `${d.pages} ${t('library.pages')}`
    : d.sections
      ? `${d.sections} ${t('document.sections')}`
      : '';

  if (view === 'list') {
    // Compact list row — same data as the card, denser for scanning long corpora.
    return (
      <li className={hub.rowWrap}>
        <Link
          to={`${CORPUS[kind].base}/${d.slug}`}
          className={styles.row}
          style={{ '--cat-color': catColor(d.category) } as CSSProperties}
        >
          <span className={hub.rowBar} aria-hidden="true" />
          <span className={styles.rowBadge}>
            {d.part ? `${t('library.part')} ${d.part}` : d.badge}
          </span>
          <span className={styles.rowTitle}>{d.title}</span>
          <span className={styles.rowCat}>{categoryLabel(d.category)}</span>
          {meta && <span className={styles.rowMeta}>{meta}</span>}
        </Link>
        <button
          type="button"
          className={`${hub.rowStar} ${marked ? hub.starOn : ''}`}
          aria-pressed={marked}
          aria-label={t(marked ? 'library.unbookmark' : 'library.bookmark')}
          onClick={onToggleBookmark}
        >
          {marked ? '★' : '☆'}
        </button>
      </li>
    );
  }

  return (
    <li className={styles.cardWrap}>
      <button
        type="button"
        className={`${styles.star} ${marked ? styles.starOn : ''}`}
        aria-pressed={marked}
        aria-label={t(marked ? 'library.unbookmark' : 'library.bookmark')}
        onClick={onToggleBookmark}
      >
        {marked ? '★' : '☆'}
      </button>
      <Link
        to={`${CORPUS[kind].base}/${d.slug}`}
        className={styles.card}
        style={{ '--cat-color': catColor(d.category) } as CSSProperties}
      >
        <span className={styles.catBar} aria-hidden="true" />
        <span className={styles.cardHead}>
          <span className={styles.badge}>
            {d.part ? `${t('library.part')} ${d.part}` : d.badge}
          </span>
          {meta && <span className={styles.meta}>{meta}</span>}
        </span>
        <span className={styles.cardTitle}>{d.title}</span>
        <span className={styles.cardFoot}>
          <span className={styles.cat}>{categoryLabel(d.category)}</span>
          <span className={styles.open}>{t('common.open')} →</span>
        </span>
      </Link>
    </li>
  );
}
