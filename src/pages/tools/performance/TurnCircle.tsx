import type { CSSProperties } from 'react';
import styles from './TurnCircle.module.css';

/**
 * Top-down turn-circle schematic shared by the standard-rate-turn and
 * turn-performance tools: a dashed circle with an aircraft riding it (the one
 * focal loop — a steady orbit whose pace tracks the bank), a centre and a radius
 * spoke marked `R`. The circle is a fixed-size schematic; the radius figure
 * carries the real scale from the stat above and the aria label, the same way
 * `SunArc` fixes the arc and lets the stats carry the sunrise/sunset times.
 */
const C = 100;
const R = 74;

interface TurnCircleProps {
  /** Bank angle, degrees — steeper banks spin the orbit marker faster. */
  bankDeg: number;
  /** Translated accessibility label (carries the radius/bank figures). */
  label: string;
}

export function TurnCircle({ bankDeg, label }: TurnCircleProps) {
  // Steeper bank → tighter, quicker turn: map 10°–60° onto a 12s–5s orbit so
  // the loop's pace tracks the geometry without ever racing. Purely decorative.
  const clamped = Math.min(Math.max(bankDeg, 10), 60);
  const period = (12 - ((clamped - 10) / 50) * 7).toFixed(1);

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 200 200" className={styles.svg} role="img" aria-label={label}>
        {/* Turn path */}
        <circle cx={C} cy={C} r={R} className={styles.path} />
        {/* Radius spoke + centre */}
        <line x1={C} y1={C} x2={C + R} y2={C} className={styles.spoke} />
        <circle cx={C} cy={C} r={2.5} className={styles.centre} />
        <text x={C + R / 2} y={C - 6} textAnchor="middle" className={styles.radiusLabel}>
          R
        </text>
        {/* Orbiting aircraft — the single focal loop */}
        <g className={styles.orbit} style={{ '--period': `${period}s` } as CSSProperties}>
          <polygon
            points={`${C + 9},${C - R} ${C - 7},${C - R - 5} ${C - 7},${C - R + 5}`}
            className={styles.craft}
          />
        </g>
      </svg>
    </div>
  );
}
