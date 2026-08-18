import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { DigestPart } from '@/calc/chat/chatSources';
import styles from './SourcesDigest.module.css';

/**
 * "Referenced in this conversation" — the unique GACAR Parts cited across every
 * answer so far, each a chip linking into the Library. Reinforces the
 * load-bearing "cites the exact section" promise. Renders nothing when no cited
 * source resolved to a known Part.
 */
export function SourcesDigest({ parts }: { parts: DigestPart[] }) {
  const { t } = useTranslation();
  if (parts.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{t('chat.referenced')}</span>
      <ul className={styles.chips}>
        {parts.map((p) => (
          <li key={p.slug}>
            <Link className={styles.chip} to={`/library/${p.slug}`}>
              <bdi dir="ltr" lang="en">
                {t('chat.partLabel', { n: p.num })}
              </bdi>
              {p.count > 1 && <span className={styles.count}>{p.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
