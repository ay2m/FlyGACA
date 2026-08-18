import type { CSSProperties } from 'react';
import { currencyRingFraction, type CurrencyItem } from '@/calc/pilot/currency';
import styles from './CurrencyRing.module.css';

const R = 15;
const CIRC = 2 * Math.PI * R;

/** A shape cue per status, so the ring reads without relying on hue (the
 *  cockpit theme collapses the accents to amber). */
const GLYPH: Record<CurrencyItem['status'], string> = {
  current: '✓',
  expiring: '!',
  expired: '✕',
  unknown: '?',
};

interface CurrencyRingProps {
  item: Pick<CurrencyItem, 'status' | 'daysLeft'>;
}

/**
 * A small radial "runway" dial for one currency row: the arc fills with the
 * days remaining over the planning horizon and carries a status glyph in the
 * centre. Decorative — the row's pill and days text carry the meaning — so the
 * ring is hidden from AT; the arc glides as the value changes.
 */
export function CurrencyRing({ item }: CurrencyRingProps) {
  const frac = currencyRingFraction(item);
  return (
    <div className={`${styles.ring} ${styles[item.status]}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" className={styles.svg}>
        <circle cx={20} cy={20} r={R} className={styles.track} />
        <circle
          cx={20}
          cy={20}
          r={R}
          className={styles.arc}
          style={
            {
              '--circ': `${CIRC.toFixed(2)}`,
              '--offset': `${(CIRC * (1 - frac)).toFixed(2)}`,
            } as CSSProperties
          }
        />
      </svg>
      <span className={styles.glyph}>{GLYPH[item.status]}</span>
    </div>
  );
}
