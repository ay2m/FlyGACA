import type { CSSProperties } from 'react';
import styles from './SunArc.module.css';

const CX = 100;
const HORIZON = 100;
const R = 88;

interface SunArcProps {
  /**
   * Sun position along the day, 0 (sunrise) → 1 (sunset). `null` places the
   * sun at solar noon and holds it — used when the queried date isn't today,
   * so the arc reads as "this day's sun path" without implying a live time.
   */
  progress: number | null;
  /** Accessible label (the sunrise/sunset figures live in the stats above). */
  label: string;
}

/**
 * A day's sun-path arc: a semicircle from sunrise (left horizon) over solar
 * noon to sunset (right horizon), with the sun disc riding the arc at the
 * current fraction of daylight and gliding as that fraction climbs.
 */
export function SunArc({ progress, label }: SunArcProps) {
  const p = progress ?? 0.5;
  const theta = Math.PI * (1 - p); // π at sunrise → 0 at sunset
  const x = CX + R * Math.cos(theta);
  const y = HORIZON - R * Math.sin(theta);
  const arc = `M ${CX - R} ${HORIZON} A ${R} ${R} 0 0 1 ${CX + R} ${HORIZON}`;
  return (
    <div className={`${styles.wrap} ${progress == null ? styles.static : ''}`}>
      <svg viewBox="0 0 200 116" className={styles.svg} role="img" aria-label={label}>
        <path d={`${arc} Z`} className={styles.sky} />
        <path d={arc} className={styles.path} />
        <line
          x1={CX - R - 6}
          y1={HORIZON}
          x2={CX + R + 6}
          y2={HORIZON}
          className={styles.horizon}
        />
        <g
          className={styles.sun}
          style={{ '--x': `${x.toFixed(1)}px`, '--y': `${y.toFixed(1)}px` } as CSSProperties}
        >
          <circle r={14} className={styles.halo} />
          <circle r={8} className={styles.core} />
        </g>
      </svg>
    </div>
  );
}
