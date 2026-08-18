import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { searchEntryLink, searchHref } from '@/lib/contentLinks';
import type { LibraryKind, SearchEntry } from '@/lib/content';
import styles from './Library.module.css';
import { highlight } from '@/components/highlight';

/** Full-text results revealed per "load more" page. */
const PAGE = 30;

/** Split text on a case-insensitive needle, wrapping matches in <mark>. */

/** The paginated, keyboard-navigable full-text hit list. */
export function LibrarySearchResults({
  q,
  kind,
  category,
  hits,
  indexLoading,
  entriesLoaded,
  cap,
}: {
  q: string;
  kind: LibraryKind;
  category: string;
  hits: SearchEntry[];
  indexLoading: boolean;
  entriesLoaded: boolean;
  /** The hit cap the parent applied, for the refine hint. */
  cap: number;
}) {
  const { t } = useTranslation();
  // Reset the visible window whenever the search scope changes (an effect, not
  // a key-remount, so an in-progress focus inside the list is preserved).
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [q, kind, category]);
  const shownHits = hits.slice(0, visible);
  const hitRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  function onHitKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = hitRefs.current.filter(Boolean) as HTMLAnchorElement[];
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === 'ArrowDown' ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
    items[at === -1 ? 0 : next]?.focus();
  }

  return (
    <section className={styles.results}>
      {indexLoading && !entriesLoaded ? (
        <p className={styles.resultsMeta} role="status">
          {t('library.searching')}
        </p>
      ) : hits.length === 0 ? (
        <p className={styles.resultsMeta} role="status">
          {t('library.noFullMatches', { q })}
        </p>
      ) : (
        <>
          <h2 className={styles.resultsHead}>{t('library.fullResults')}</h2>
          <p className={styles.resultsMeta} role="status" aria-live="polite">
            {t('library.showing', { shown: shownHits.length, total: hits.length })}
            {hits.length >= cap && ` · ${t('library.capHint', { max: cap })}`}
          </p>
          <ul className={styles.hitList} onKeyDown={onHitKeyDown}>
            {shownHits.map((e, i) => {
              const href = searchHref(searchEntryLink(e), q);
              const body = (
                <Fragment>
                  <span className={styles.hitBadge}>{e.b}</span>
                  <span className={styles.hitTitle}>{highlight(e.d, q)}</span>
                  {e.x && <span className={styles.hitExcerpt}>{highlight(e.x, q)}</span>}
                </Fragment>
              );
              return (
                <li key={`${href ?? e.d}-${i}`}>
                  {href ? (
                    <Link
                      to={href}
                      className={styles.hit}
                      ref={(el) => {
                        hitRefs.current[i] = el;
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <span className={styles.hit}>{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {visible < hits.length && (
            <button
              type="button"
              className={styles.loadMore}
              onClick={() => setVisible((v) => v + PAGE)}
            >
              {t('library.loadMore')}
            </button>
          )}
        </>
      )}
    </section>
  );
}
