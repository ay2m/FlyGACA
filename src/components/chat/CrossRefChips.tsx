import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CrossRef } from '@/calc/chat/chatCrossRefs';
import styles from './CrossRefChips.module.css';

/**
 * "Also referenced" — Parts an answer mentions in prose beyond its own source
 * list, each a chip into the Library. Helps a reader follow the regulation's own
 * cross-references. Renders nothing when there are none.
 */
export function CrossRefChips({ refs }: { refs: CrossRef[] }) {
  const { t } = useTranslation();
  if (refs.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{t('chat.alsoReferenced')}</span>
      <ul className={styles.chips}>
        {refs.map((r) => (
          <li key={r.slug}>
            <Link className={styles.chip} to={`/library/${r.slug}`}>
              <bdi dir="ltr" lang="en">
                {t('chat.partLabel', { n: r.num })}
              </bdi>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
