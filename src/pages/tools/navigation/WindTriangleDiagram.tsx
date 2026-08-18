import { useTranslation } from 'react-i18next';
import { norm360 } from '@/calc/guards';
import styles from './WindTriangleDiagram.module.css';

interface WindTriangleDiagramProps {
  courseDeg: number;
  tasKt: number;
  windDirDeg: number;
  windSpeedKt: number;
  headingDeg: number;
  groundSpeedKt: number;
}

const C = 110;
/** Aviation bearing → screen point at radius `r` (y grows down). Bearings are
 *  normalised first so unconstrained inputs stay numerically stable. */
const pt = (deg: number, r: number) => ({
  x: C + Math.sin((norm360(deg) * Math.PI) / 180) * r,
  y: C - Math.cos((norm360(deg) * Math.PI) / 180) * r,
});

/**
 * The wind triangle drawing itself: heading/TAS vector first, the wind vector
 * slides on from its tip, and the resulting course/groundspeed vector closes
 * the triangle. Re-keyed by the inputs so every change replays the
 * construction (statically complete under reduced motion). Decorative — the
 * numbers live in the ResultStats.
 */
export function WindTriangleDiagram({
  courseDeg,
  tasKt,
  windDirDeg,
  windSpeedKt,
  headingDeg,
  groundSpeedKt,
}: WindTriangleDiagramProps) {
  const { t } = useTranslation();
  const scale = 82 / Math.max(tasKt, groundSpeedKt, windSpeedKt, 1);
  // Triangle: O --TAS along heading--> H, then H --wind--> G, and O→G is the
  // course/groundspeed vector.
  const h = pt(headingDeg, tasKt * scale);
  const g = pt(courseDeg, groundSpeedKt * scale);
  // Normalised so the accessible text always reads as a 0–359° bearing.
  const label = t('windTriangle.diagramLabel', {
    hdg: Math.round(norm360(headingDeg)),
    wdir: Math.round(norm360(windDirDeg)),
    wspd: Math.round(windSpeedKt),
    gs: Math.round(groundSpeedKt),
  });
  const key = `${courseDeg}|${tasKt}|${windDirDeg}|${windSpeedKt}`;
  return (
    <figure className={styles.wrap} key={key}>
      <svg viewBox="0 0 220 220" width={220} height={220} role="img" aria-label={label}>
        <circle cx={C} cy={C} r={100} fill="none" stroke="var(--border)" strokeWidth="1" />
        {/* Extended course line for context */}
        <line
          x1={pt(courseDeg + 180, 96).x}
          y1={pt(courseDeg + 180, 96).y}
          x2={pt(courseDeg, 96).x}
          y2={pt(courseDeg, 96).y}
          stroke="var(--border-bright)"
          strokeDasharray="3 4"
        />
        {/* 1 — heading / TAS */}
        <line
          x1={C}
          y1={C}
          x2={h.x}
          y2={h.y}
          stroke="var(--link)"
          strokeWidth="2.5"
          className={styles.v1}
        />
        {/* 2 — wind, tip of TAS to tip of GS */}
        <line
          x1={h.x}
          y1={h.y}
          x2={g.x}
          y2={g.y}
          stroke="var(--warning)"
          strokeWidth="2.5"
          className={styles.v2}
        />
        {/* 3 — course / groundspeed closes the triangle */}
        <line
          x1={C}
          y1={C}
          x2={g.x}
          y2={g.y}
          stroke="var(--success)"
          strokeWidth="3"
          className={styles.v3}
        />
        <circle cx={C} cy={C} r={3.5} fill="var(--text)" />
      </svg>
      <figcaption className={styles.caption}>
        <span className={styles.kHdg}>{t('windTriangle.heading')}</span>
        <span className={styles.kWind}>{t('windTriangle.legendWind')}</span>
        <span className={styles.kGs}>{t('windTriangle.gs')}</span>
      </figcaption>
    </figure>
  );
}
