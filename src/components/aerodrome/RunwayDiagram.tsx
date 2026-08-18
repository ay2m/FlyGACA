import { useTranslation } from 'react-i18next';
import { bearingPoint, parseRunwayHeading, runwayEnds } from '@/calc/runway';
import type { Airport } from '@/lib/content';
import styles from './aerodrome.module.css';

interface Props {
  rwys: Airport['rwys'];
}

const C = 100; // centre
const R_RING = 88; // compass ring radius
const R_RWY = 72; // runway half-length

/**
 * A top-down runway-orientation diagram: each runway is drawn as a strip at its
 * true-ish heading (derived from the designator) over a compass rose. Renders
 * nothing when no runway has a parseable heading (e.g. helipads only).
 */
export function RunwayDiagram({ rwys }: Props) {
  const { t } = useTranslation();
  const runways = rwys
    .map((r) => ({ id: r.id, heading: parseRunwayHeading(r.id), ends: runwayEnds(r.id) }))
    .filter(
      (r): r is { id: string; heading: number; ends: [string, string] } => r.heading !== null,
    );

  if (runways.length === 0) return null;

  return (
    <svg
      className={styles.diagram}
      viewBox="0 0 200 200"
      role="img"
      aria-label={t('aerodromesTool.runwayDiagram')}
    >
      <circle className={styles.ring} cx={C} cy={C} r={R_RING} />
      {/* Cardinal ticks + N marker. */}
      {[0, 90, 180, 270].map((b) => {
        const a = bearingPoint(b, R_RING, C, C);
        const inner = bearingPoint(b, R_RING - 8, C, C);
        return <line key={b} className={styles.tick} x1={a.x} y1={a.y} x2={inner.x} y2={inner.y} />;
      })}
      <text className={styles.north} x={C} y={18} textAnchor="middle">
        N
      </text>

      {runways.map((r) => {
        const a = bearingPoint(r.heading, R_RWY, C, C);
        const b = bearingPoint((r.heading + 180) % 360, R_RWY, C, C);
        const la = bearingPoint(r.heading, R_RWY + 12, C, C);
        const lb = bearingPoint((r.heading + 180) % 360, R_RWY + 12, C, C);
        return (
          <g key={r.id}>
            <line className={styles.runway} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <text className={styles.rwyLabel} x={la.x} y={la.y} textAnchor="middle" dy="0.32em">
              {r.ends[0]}
            </text>
            <text className={styles.rwyLabel} x={lb.x} y={lb.y} textAnchor="middle" dy="0.32em">
              {r.ends[1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
