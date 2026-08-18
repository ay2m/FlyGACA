import type { CSSProperties } from 'react';
import styles from './ProgressRing.module.css';

const R = 9;
const CIRC = 2 * Math.PI * R;

interface ProgressRingProps {
  /** Completion in 0…1 (clamped). */
  value: number;
  /** Diameter in px (default 22). */
  size?: number;
  /**
   * Accessible label. When set the ring is exposed as a `progressbar`;
   * otherwise it is decorative (a nearby live region carries the numbers).
   */
  label?: string;
}

/**
 * A small determinate radial progress indicator: the arc sweeps clockwise from
 * 12 o'clock to `value` of a full turn and glides as the value climbs. It
 * inherits `currentColor`, so it takes on whatever accent its host carries
 * (e.g. the brand-tinted "save for offline" button). Decorative by default.
 */
export function ProgressRing({ value, size = 22, label }: ProgressRingProps) {
  const frac = Math.min(1, Math.max(0, value || 0));
  const a11y = label
    ? {
        role: 'progressbar' as const,
        'aria-label': label,
        'aria-valuenow': Math.round(frac * 100),
        'aria-valuemin': 0,
        'aria-valuemax': 100,
      }
    : { 'aria-hidden': true };
  return (
    <span
      className={styles.ring}
      style={{ inlineSize: `${size}px`, blockSize: `${size}px` } as CSSProperties}
      {...a11y}
    >
      <svg viewBox="0 0 24 24" className={styles.svg}>
        <circle cx={12} cy={12} r={R} className={styles.track} />
        <circle
          cx={12}
          cy={12}
          r={R}
          className={styles.arc}
          style={
            {
              '--circ': CIRC.toFixed(2),
              '--offset': (CIRC * (1 - frac)).toFixed(2),
            } as CSSProperties
          }
        />
      </svg>
    </span>
  );
}
