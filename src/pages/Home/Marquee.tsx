import { useTranslation } from 'react-i18next';
import styles from './Marquee.module.css';

interface MarqueeItem {
  code: string;
  text: string;
}

/**
 * A slow horizontal ticker of corpus facts, lifted from the landing comp. The
 * track is duplicated so the scroll loops seamlessly; under reduced-motion it
 * stops animating and wraps the items into a centred, readable row instead.
 * Decorative emphasis only — the figures echo the hero's proof stats.
 */
export function Marquee() {
  const { t } = useTranslation();
  const items = t('home.marquee', { returnObjects: true }) as MarqueeItem[];
  if (!Array.isArray(items) || items.length === 0) return null;

  const row = (keyPrefix: string, hidden: boolean) => (
    <ul className={styles.group} aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <li key={`${keyPrefix}-${i}`} className={styles.item}>
          <b className={styles.code}>{it.code}</b>
          <span>{it.text}</span>
          <span className={styles.sep} aria-hidden="true" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.marquee} role="marquee">
      <div className={styles.track}>
        {row('a', false)}
        {/* Duplicate copy makes the loop seamless; hidden from AT to avoid echo. */}
        {row('b', true)}
      </div>
    </div>
  );
}
