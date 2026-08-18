import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CORPUS } from '@/lib/content';
import { bookmarkKey, type LibBookmark, type LibDoc } from '@/lib/prefs/libraryPrefs';
import styles from './Library.module.css';

/** The "continue reading" and saved-bookmarks shelves shown while not searching. */
export function LibraryShelves({
  recents,
  bookmarks,
}: {
  recents: LibDoc[];
  bookmarks: LibBookmark[];
}) {
  const { t } = useTranslation();
  return (
    <>
      {recents.length > 0 && (
        <section className={styles.personal} aria-label={t('library.continueReading')}>
          <h2 className={styles.personalHead}>{t('library.continueReading')}</h2>
          <ul className={styles.personalRow}>
            {recents.map((d) => (
              <li key={`${d.kind}:${d.slug}`}>
                <Link to={`${CORPUS[d.kind].base}/${d.slug}`} className={styles.personalCard}>
                  <span className={styles.personalKind}>{t(`library.kind.${d.kind}`)}</span>
                  <span className={styles.personalTitle}>{d.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bookmarks.length > 0 && (
        <section className={styles.personal} aria-label={t('library.savedTitle')}>
          <h2 className={styles.personalHead}>★ {t('library.savedTitle')}</h2>
          <ul className={styles.personalRow}>
            {bookmarks.map((b) => (
              <li key={bookmarkKey(b)}>
                <Link
                  to={`${CORPUS[b.kind].base}/${b.slug}${b.anchor ? `#${b.anchor}` : ''}`}
                  className={styles.personalCard}
                >
                  <span className={styles.personalKind}>{t(`library.kind.${b.kind}`)}</span>
                  <span className={styles.personalTitle}>
                    {b.anchorText ? `${b.title} · ${b.anchorText}` : b.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
