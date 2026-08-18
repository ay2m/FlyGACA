import { useTranslation } from 'react-i18next';
import { norm360 } from '@/calc/guards';
import type { HoldingEntry } from '@/calc/holding';
import styles from './HoldingDiagram.module.css';

interface HoldingDiagramProps {
  inboundDeg: number;
  entry: HoldingEntry;
  rightTurns: boolean;
}

const CX = 110;
const FIX_Y = 96;

/**
 * Racetrack + entry paths in a local frame where the inbound course points
 * straight up at the fix (110, 96); the whole group is rotated by the real
 * inbound course. Right-hand geometry; left-hand mirrors x about the fix.
 */
const TRACK = 'M 110 166 L 110 96 A 26 26 0 0 1 162 96 L 162 166 A 26 26 0 0 1 110 166 Z';
const ENTRY_PATHS: Record<HoldingEntry, string> = {
  // Straight in over the fix, then fly the racetrack.
  direct: 'M 110 210 L 110 96',
  // Cross the fix, parallel the inbound track outbound on the non-holding
  // side, then turn back through the fix.
  parallel: 'M 148 206 L 110 96 L 102 96 L 102 160 A 20 20 0 0 1 66 148 L 104 104',
  // Cross the fix, track ~30° into the holding side outbound, teardrop back.
  teardrop: 'M 76 202 L 110 96 L 138 40 A 20 20 0 0 1 172 58 L 162 96',
};

const mirror = (right: boolean) => (right ? undefined : `translate(${2 * CX} 0) scale(-1 1)`);

/**
 * Animated holding-pattern diagram: the racetrack oriented to the real inbound
 * course, the computed entry drawn as a dashed path, and a small aircraft that
 * flies the entry on a CSS motion path (hidden under reduced motion; browsers
 * without `offset-path` simply show it parked at the entry start). Decorative
 * to AT — the entry result is announced by the page's ResultStat.
 */
export function HoldingDiagram({ inboundDeg, entry, rightTurns }: HoldingDiagramProps) {
  const { t } = useTranslation();
  const entryPath = ENTRY_PATHS[entry];
  const label = t('holding.diagramLabel', {
    entry: t(`holding.${entry}`),
    inbound: Math.round(norm360(inboundDeg)),
    turns: t(rightTurns ? 'holding.right' : 'holding.left'),
  });
  return (
    <figure className={styles.wrap}>
      <svg
        viewBox="0 0 220 220"
        width={220}
        height={220}
        role="img"
        aria-label={label}
        className={styles.svg}
      >
        {/* Compass ring for orientation */}
        <circle cx={CX} cy={110} r={104} fill="none" stroke="var(--border)" strokeWidth="1" />
        <text x={CX} y={14} textAnchor="middle" className={styles.north}>
          N
        </text>
        <g transform={`rotate(${norm360(inboundDeg)} ${CX} ${FIX_Y})`}>
          <g transform={mirror(rightTurns)}>
            {/* Racetrack */}
            <path d={TRACK} fill="none" stroke="var(--link)" strokeWidth="2.5" />
            {/* Inbound arrowhead just before the fix */}
            <path
              d="M 104 116 L 110 102 L 116 116"
              fill="none"
              stroke="var(--link)"
              strokeWidth="2"
            />
            {/* Entry path */}
            <path
              d={entryPath}
              fill="none"
              stroke="var(--success)"
              strokeWidth="2"
              strokeDasharray="5 4"
              className={styles.entry}
            />
            {/* The aircraft flying the entry */}
            <path
              d="M 0 -7 L 5 6 L 0 3 L -5 6 Z"
              fill="var(--success)"
              className={styles.plane}
              style={{ offsetPath: `path('${entryPath}')` }}
            />
            {/* Holding fix */}
            <circle cx={CX} cy={FIX_Y} r={4} fill="var(--danger)" />
          </g>
        </g>
      </svg>
      <figcaption className={styles.caption}>{label}</figcaption>
    </figure>
  );
}
