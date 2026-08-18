import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import styles from './WindDiagram.module.css';

/** Compact wind-vector diagram: runway aligned to its heading, wind arrow
 *  blowing from the reported direction. Ported from tools-crosswind.js draw().
 *  The wind arrow is the single focal element — it glides to its new bearing as
 *  the reported direction changes; the runway stays put as the reference frame. */
interface WindDiagramProps {
  runwayHeading: number;
  windDir: number;
  windSpeed: number;
  crosswind: number;
  /** Descriptive, translated accessibility label for the whole figure. */
  label?: string;
}

const CX = 110;
const CY = 110;
const R = 96;

function pt(brg: number, r: number): [number, number] {
  const rad = (brg * Math.PI) / 180;
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
}

export function WindDiagram({
  runwayHeading,
  windDir,
  windSpeed,
  crosswind,
  label,
}: WindDiagramProps) {
  const { t } = useTranslation();
  const xwBad = Math.abs(crosswind) >= 15;
  const stroke = xwBad ? 'var(--danger)' : 'var(--link)';

  const [labelX, labelY] = pt(windDir, R);

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const [tx1, ty1] = pt(i * 30, R);
    const [tx2, ty2] = pt(i * 30, R - 6);
    return (
      <line
        key={i}
        x1={tx1}
        y1={ty1}
        x2={tx2}
        y2={ty2}
        stroke="var(--border-bright)"
        strokeWidth={1.5}
      />
    );
  });

  const compass = (
    [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270],
    ] as const
  ).map(([lbl, brg]) => {
    const [x, y] = pt(brg, R - 14);
    return (
      <text key={lbl} x={x} y={y + 4} textAnchor="middle" fontSize={11} fill="var(--text-dim)">
        {lbl}
      </text>
    );
  });

  return (
    <svg
      viewBox="0 0 220 220"
      width={220}
      height={220}
      role="img"
      aria-label={label ?? t('crosswind.diagramAria')}
    >
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={2} />
      {ticks}
      <g>
        <rect
          x={CX - 7}
          y={CY - 62}
          width={14}
          height={124}
          rx={3}
          fill="var(--diagram-runway)"
          transform={`rotate(${runwayHeading} ${CX} ${CY})`}
        />
        <line
          x1={CX}
          y1={CY - 56}
          x2={CX}
          y2={CY + 56}
          stroke="var(--text)"
          strokeWidth={1.5}
          strokeDasharray="6 5"
          transform={`rotate(${runwayHeading} ${CX} ${CY})`}
        />
      </g>
      <g className={styles.wind} style={{ '--dir': `${windDir}deg` } as CSSProperties}>
        <line
          x1={CX}
          y1={CY - (R - 6)}
          x2={CX}
          y2={CY - 34}
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <polygon
          points={`${CX},${CY - 30} ${CX - 6},${CY - 44} ${CX + 6},${CY - 44}`}
          fill={stroke}
        />
      </g>
      <text
        x={labelX}
        y={labelY - 6}
        textAnchor="middle"
        fontSize={11}
        fill="var(--text-muted)"
        style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
      >
        {Math.round(windSpeed)} kt
      </text>
      {compass}
    </svg>
  );
}
