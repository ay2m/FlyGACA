import type { CSSProperties } from 'react';
import { AIRAC_CYCLE_DAYS } from '@/calc/airac';
import styles from './AiracRing.module.css';

const R = 52;
const CIRC = 2 * Math.PI * R;

interface AiracRingProps {
  /** Effective cycle id, e.g. "2609". */
  id: string;
  /** 1-based day within the cycle. */
  dayInCycle: number;
  /** Fraction of the cycle elapsed, 0…1. */
  fraction: number;
  /** Accessible label (the effective/next dates live in the stats). */
  label: string;
}

/**
 * A ring that fills with the current AIRAC cycle's progress: the effective
 * cycle id sits in the centre with the day-of-28 beneath it, and the arc
 * sweeps from the effective date toward the next, gliding as it advances.
 */
export function AiracRing({ id, dayInCycle, fraction, label }: AiracRingProps) {
  const offset = CIRC * (1 - Math.min(1, Math.max(0, fraction)));
  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 120 120" className={styles.svg} role="img" aria-label={label}>
        <circle cx={60} cy={60} r={R} className={styles.track} />
        <circle
          cx={60}
          cy={60}
          r={R}
          className={styles.arc}
          style={{ '--circ': CIRC.toFixed(2), '--offset': offset.toFixed(2) } as CSSProperties}
        />
      </svg>
      <div className={styles.center} aria-hidden="true">
        <span className={styles.id}>{id}</span>
        <span className={styles.day}>
          <bdi dir="ltr">
            {dayInCycle} / {AIRAC_CYCLE_DAYS}
          </bdi>
        </span>
      </div>
    </div>
  );
}
