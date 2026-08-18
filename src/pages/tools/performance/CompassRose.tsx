import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import type { RunwayWind } from '@/calc/windTable';
import styles from './CompassRose.module.css';

/**
 * Compass rose for the wind-table tool: every parsed runway drawn as a spoke on
 * its heading (tinted by crosswind severity), with the reported wind as a gold
 * arrow that glides to its bearing — the single focal loop. The whole set of
 * runway/wind relationships the table lists numerically, read at a glance.
 */
const CX = 110;
const CY = 110;
const R = 96;
const HUB = 18;

function pt(brg: number, r: number): [number, number] {
  const rad = (brg * Math.PI) / 180;
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
}

interface CompassRoseProps {
  windDir: number;
  windSpeed: number;
  rows: RunwayWind[];
}

export function CompassRose({ windDir, windSpeed, rows }: CompassRoseProps) {
  const { t } = useTranslation();

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const [tx1, ty1] = pt(i * 30, R);
    const [tx2, ty2] = pt(i * 30, R - 6);
    return <line key={i} x1={tx1} y1={ty1} x2={tx2} y2={ty2} className={styles.tick} />;
  });

  const compass = (
    [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270],
    ] as const
  ).map(([lbl, brg]) => {
    const [x, y] = pt(brg, R - 15);
    return (
      <text key={lbl} x={x} y={y + 4} textAnchor="middle" className={styles.cardinal}>
        {lbl}
      </text>
    );
  });

  const spokes = rows.map((r) => {
    const [x1, y1] = pt(r.heading, HUB);
    const [x2, y2] = pt(r.heading, R - 14);
    const [lx, ly] = pt(r.heading, R - 4);
    const bad = Math.abs(r.crosswind) >= 15;
    return (
      <g key={r.label} className={bad ? styles.spokeBad : styles.spoke}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <text x={lx} y={ly + 3} textAnchor="middle" className={styles.rwyLabel}>
          {r.label}
        </text>
      </g>
    );
  });

  return (
    <div className={styles.wrap}>
      <svg
        viewBox="0 0 220 220"
        className={styles.svg}
        role="img"
        aria-label={t('compassRose.aria', { dir: Math.round(windDir), spd: Math.round(windSpeed) })}
      >
        <circle cx={CX} cy={CY} r={R} className={styles.ring} />
        {ticks}
        {compass}
        {spokes}

        {/* Reported wind — the focal element, gliding to its bearing. */}
        <g className={styles.wind} style={{ '--dir': `${windDir}deg` } as CSSProperties}>
          <line x1={CX} y1={CY - (R - 6)} x2={CX} y2={CY - 34} className={styles.windShaft} />
          <polygon
            points={`${CX},${CY - 30} ${CX - 6},${CY - 44} ${CX + 6},${CY - 44}`}
            className={styles.windHead}
          />
        </g>

        {/* Speed hub — always upright, holds the wind magnitude. */}
        <circle cx={CX} cy={CY} r={HUB} className={styles.hub} />
        <text x={CX} y={CY + 4} textAnchor="middle" className={styles.hubText}>
          {Math.round(windSpeed)} kt
        </text>
      </svg>
    </div>
  );
}
