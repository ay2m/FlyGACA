import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ChatSource } from '@/lib/api';
import { partSlug } from '@/calc/chat/chatSources';
import styles from './SourceList.module.css';

/** Citation chips; rows with a verbatim passage expand via a native <details>. */
export function SourceList({ sources, valid }: { sources: ChatSource[]; valid: Set<string> }) {
  const { t } = useTranslation();
  // Surface the most-relevant rule text up front: open the first verbatim passage.
  const firstVerbatim = sources.findIndex((s) => s.verbatim);
  return (
    <div className={styles.sourcesWrap}>
      <span className={styles.sourcesLabel}>{t('chat.sourcesLabel')}</span>
      <ul className={styles.sources}>
        {sources.map((s, j) => {
          const slug = partSlug(valid, s.part, s.section, s.citation);
          return (
            <li
              key={j}
              className={`${styles.srcRow} ${s.verbatim ? styles.srcRowFull : ''}`}
              style={{ '--i': j } as CSSProperties}
            >
              {s.verbatim ? (
                <details className={styles.srcDetails} open={j === firstVerbatim}>
                  <summary className={styles.srcCite}>
                    <bdi dir="ltr" lang="en">
                      {s.citation || s.url}
                    </bdi>
                    <span className={styles.srcExact}>{t('chat.exactText')}</span>
                  </summary>
                  <p className={styles.srcVerbatim}>{s.verbatim}</p>
                  {s.corpusVersion && (
                    <span className={styles.srcVer}>
                      <bdi dir="ltr" lang="en">
                        {s.corpusVersion}
                      </bdi>
                    </span>
                  )}
                </details>
              ) : (
                <span className={styles.srcCite}>
                  <bdi dir="ltr" lang="en">
                    {s.citation || s.url}
                  </bdi>
                </span>
              )}
              {slug && (
                <Link className={styles.srcOpen} to={`/library/${slug}`}>
                  {t('chat.openInLibrary')}
                </Link>
              )}
              {s.url && (
                <a className={styles.srcOpen} href={s.url} target="_blank" rel="noopener">
                  {t('chat.open')}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
