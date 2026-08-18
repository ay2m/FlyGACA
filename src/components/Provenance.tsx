import { useTranslation } from 'react-i18next';
import styles from './Provenance.module.css';

export interface ProvenanceProps {
  /** ISO date (YYYY-MM-DD) the content was last captured / became effective. */
  date?: string;
  /** Revision / amendment marker the source carries (e.g. "Rev 3", AC letter "C"). */
  revision?: string;
  /** The authoritative source URL — the doc's own if known, else the corpus index's. */
  sourceUrl?: string;
}

/**
 * A compact, reusable provenance trail for reproduced content: when we captured
 * it, which revision, and a link to the authoritative source. It makes the
 * sourcing explicit for readers and for search / AI answer engines (an E-E-A-T
 * signal that pairs with the /about corrections policy), and it reinforces that
 * GACA is the authority — the link points at the official publication, not a
 * substitute. Renders nothing when it has no provenance to show, so it's safe to
 * drop onto any content surface. The not-affiliated / verify-against-GACA line
 * stays in <Disclaimer/>; this never restates it.
 */
export function Provenance({ date, revision, sourceUrl }: ProvenanceProps) {
  const { t } = useTranslation();
  if (!date && !revision && !sourceUrl) return null;
  return (
    <div className={styles.wrap} aria-label={t('provenance.label')}>
      {date && (
        <time className={styles.item} dateTime={date}>
          {t('provenance.updated', { date })}
        </time>
      )}
      {revision && <span className={styles.item}>{t('provenance.revision', { revision })}</span>}
      {sourceUrl && (
        <a
          className={styles.source}
          href={sourceUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          title={t('provenance.officialSourceTitle')}
        >
          {t('provenance.officialSource')} ↗
        </a>
      )}
    </div>
  );
}
