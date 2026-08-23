import { fin } from '@/calc/guards';
import { fmtInt } from './format';
import styles from './GaugeDial.module.css';

interface GaugeDialProps {
  /** Already-translated label under the dial. */
  label: string;
  value: number | null;
  min: number;
  max: number;
  unit: string;
  /** Decimal places for the centre readout; 0 (default) renders a whole number. */
  decimals?: number;
}

/** Sweep geometry: −120° (min) to +120° (max), needle pointing up at mid. */
const SWEEP_FROM = -120;
const SWEEP_TO = 120;

/** Needle rotation for a value, clamped to the dial's sweep. */
// eslint-disable-next-line react-refresh/only-export-components
export function gaugeAngle(value: number, min: number, max: number): number {
  if (!fin(value, min, max) || max <= min) return SWEEP_FROM;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return SWEEP_FROM + t * (SWEEP_TO - SWEEP_FROM);
}

const tickAngles = Array.from(
  { length: 11 },
  (_, i) => SWEEP_FROM + (i * (SWEEP_TO - SWEEP_FROM)) / 10,
);

/**
 * A small instrument-style dial that sweeps its needle to the computed value
 * (CSS transition; snaps under reduced motion). Purely decorative company for
 * a ResultStat — the readable value stays in the stat, so the dial is hidden
 * from AT.
 */
export function GaugeDial({ label, value, min, max, unit, decimals = 0 }: GaugeDialProps) {
  const angle = value != null ? gaugeAngle(value, min, max) : SWEEP_FROM;
  const readout = value == null ? '—' : decimals > 0 ? value.toFixed(decimals) : fmtInt(value);
  return (
    <div className={styles.gauge} aria-hidden="true">
      <svg viewBox="0 0 120 120" width={120} height={120} className={styles.svg}>
        <circle cx={60} cy={60} r={54} fill="none" stroke="var(--border-bright)" strokeWidth="2" />
        {tickAngles.map((a) => (
          <line
            key={a}
            x1={60}
            y1={14}
            x2={60}
            y2={a % 60 === 0 ? 24 : 20}
            stroke="var(--text-dim)"
            strokeWidth={a % 60 === 0 ? 2 : 1}
            transform={`rotate(${a} 60 60)`}
          />
        ))}
        <g className={styles.needle} style={{ transform: `rotate(${angle.toFixed(2)}deg)` }}>
          <path d="M 60 60 L 57 56 L 60 18 L 63 56 Z" fill="var(--neon-cyan)" />
        </g>
        <circle cx={60} cy={60} r={5} fill="var(--text)" />
        <text x={60} y={92} textAnchor="middle" className={styles.value}>
          {readout}
        </text>
        <text x={60} y={104} textAnchor="middle" className={styles.unit}>
          {unit}
        </text>
      </svg>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
