import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CorpusDoc } from '@/lib/content';
import type { toolsForPartSlug } from '@/lib/toolRegulations';
import styles from './Document.module.css';

/**
 * The reader's footer navigation: related documents, the flight tools that
 * operate under this Part, and the previous/next document links. Presentational
 * page-folder sibling of the Document reader — shares its `Document.module.css`,
 * like ReaderToolbar/ReaderToc/ReaderNotes.
 */
export function ReaderFooterNav({
  related,
  partTools,
  prev,
  next,
  base,
}: {
  related: CorpusDoc[];
  partTools: ReturnType<typeof toolsForPartSlug>;
  prev: CorpusDoc | null;
  next: CorpusDoc | null;
  /** Corpus base path for links, e.g. `/library`. */
  base: string;
}) {
  const { t } = useTranslation();
  return (
    <footer className={styles.readerFooter}>
      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedHead}>{t('document.related')}</h2>
          <ul className={styles.relatedGrid}>
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`${base}/${r.slug}`} className={styles.relatedCard}>
                  {r.part && (
                    <span className={styles.relatedBadge}>
                      {t('library.part')} {r.part}
                    </span>
                  )}
                  <span className={styles.relatedTitle}>{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {partTools.length > 0 && (
        <nav className={styles.toolLinks} aria-label={t('document.relatedTools')}>
          <span className={styles.toolLinksLabel}>{t('document.relatedTools')}</span>
          <div className={styles.toolChips}>
            {partTools.map((r) => (
              <Link key={r.toolId} to={`/tools/${r.toolId}`} className={styles.toolChip}>
                {t(`tools.items.${r.toolId}.name`)}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <nav aria-label={t('document.prevNextNav')} className={styles.prevNext}>
        {prev ? (
          <Link to={`${base}/${prev.slug}`} className={styles.prevNextLink}>
            <span className={styles.prevNextDir}>← {t('document.prev')}</span>
            <span className={styles.prevNextName}>{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`${base}/${next.slug}`}
            className={`${styles.prevNextLink} ${styles.prevNextEnd}`}
          >
            <span className={styles.prevNextDir}>{t('document.next')} →</span>
            <span className={styles.prevNextName}>{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </footer>
  );
}
