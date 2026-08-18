import { useTranslation } from 'react-i18next';
import styles from './ProfileRamp.module.css';

interface ProfileRampProps {
  mode: 'climb' | 'descent';
  /** True slope angle in degrees (drives the exaggerated but ordered drawing). */
  angleDeg: number;
  /** Pre-formatted, already-localized end labels from the caller. */
  altLabel?: string;
  distLabel?: string;
}

const VW = 260;
const VH = 148;
const M = { l: 16, r: 16, t: 16, b: 26 };
const PLOT = { x: M.l, y: M.t, w: VW - M.l - M.r, h: VH - M.t - M.b };
// Profile views are schematic, not to scale — a shallow 3° descent would draw
// almost flat otherwise. The exaggeration keeps steeper vs shallower ordered.
const VE = 6;

/**
 * A side-profile ramp shared by the climb and descent tools: the ground, the
 * sloped path drawing itself in, and an aircraft sitting at the start of the
 * manoeuvre oriented along the slope. Decorative — the ResultStats carry the
 * numbers; the figure has a text summary. Reduced motion shows the full ramp.
 */
export function ProfileRamp({ mode, angleDeg, altLabel, distLabel }: ProfileRampProps) {
  const { t } = useTranslation();
  const climb = mode === 'climb';
  const baseY = PLOT.y + PLOT.h;
  const f = Math.min(1, Math.max(0.12, Math.tan((Math.abs(angleDeg) * Math.PI) / 180) * VE));
  const rise = f * PLOT.h;

  // Descent: high on the left, ground on the right. Climb mirrors it.
  const highX = climb ? PLOT.x + PLOT.w : PLOT.x;
  const lowX = climb ? PLOT.x : PLOT.x + PLOT.w;
  const highY = baseY - rise;
  const drawnDeg = (Math.atan2(rise, PLOT.w) * 180) / Math.PI;
  // Aircraft at the start of the manoeuvre: TOD (top) for descent, field for climb.
  const acX = climb ? lowX : highX;
  const acY = climb ? baseY : highY;
  const rot = climb ? -drawnDeg : drawnDeg;

  const label = t(climb ? 'profile.climb' : 'profile.descent', { angle: Math.round(angleDeg) });
  const ends = [altLabel, distLabel].filter(Boolean).join(' · ');
  const key = `${mode}|${angleDeg}`;

  return (
    <figure className={styles.wrap} key={key}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className={styles.svg}
        role="img"
        aria-label={`${label} ${ends}`}
      >
        <line x1={PLOT.x} y1={baseY} x2={PLOT.x + PLOT.w} y2={baseY} className={styles.ground} />
        <line x1={highX} y1={baseY} x2={highX} y2={highY} className={styles.drop} />
        <line x1={lowX} y1={baseY} x2={highX} y2={highY} className={styles.ramp} />
        <g
          transform={`translate(${acX} ${acY}) rotate(${rot.toFixed(2)})`}
          className={styles.plane}
        >
          <path d="M-7 0 L5 0 M2 -3 L6 0 L2 3" className={styles.planeGlyph} />
        </g>
      </svg>
      <figcaption className={styles.caption}>
        <span className={styles.mode}>{label}</span>
        {ends && <span className={styles.ends}>{ends}</span>}
      </figcaption>
    </figure>
  );
}
