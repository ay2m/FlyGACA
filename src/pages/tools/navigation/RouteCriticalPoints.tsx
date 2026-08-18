import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { fin } from '@/calc/guards';
import styles from './RouteCriticalPoints.module.css';

interface RouteCriticalPointsProps {
  totalNm: number;
  etpNm: number;
  /** May be NaN when no endurance was entered. */
  pnrNm: number;
}

const X0 = 24;
const X1 = 236;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const xFor = (nm: number, total: number) => X0 + clamp01(nm / total) * (X1 - X0);

/**
 * The leg drawn departure → destination with the equal-time point and the
 * point-of-no-return marked where they fall along it. Each marker glides to
 * its distance as the inputs change. Decorative — the ResultStats carry the
 * numbers; PNR is dashed so it reads apart from the ETP by shape, not hue.
 */
export function RouteCriticalPoints({ totalNm, etpNm, pnrNm }: RouteCriticalPointsProps) {
  const { t } = useTranslation();
  if (!fin(totalNm) || totalNm <= 0) return null;
  const hasPnr = fin(pnrNm);
  const label = hasPnr
    ? t('criticalPoint.diagramEtpPnr', {
        etp: Math.round(etpNm),
        pnr: Math.round(pnrNm),
        total: Math.round(totalNm),
      })
    : t('criticalPoint.diagramEtp', { etp: Math.round(etpNm), total: Math.round(totalNm) });
  return (
    <figure className={styles.wrap}>
      <svg viewBox="0 0 260 96" role="img" aria-label={label} className={styles.svg}>
        <line x1={X0} y1={52} x2={X1} y2={52} className={styles.route} />
        {/* departure & destination */}
        <circle cx={X0} cy={52} r={4} className={styles.node} />
        <path d={`M${X1 - 3} 46 L${X1 + 5} 52 L${X1 - 3} 58 Z`} className={styles.dest} />

        {/* ETP */}
        <g
          className={styles.marker}
          style={{ '--x': `${xFor(etpNm, totalNm)}px` } as CSSProperties}
        >
          <line x1={0} y1={34} x2={0} y2={62} className={styles.etpTick} />
          <path d="M-6 28 L5 28 M2 25 L6 28 L2 31" className={styles.plane} />
          <text x={0} y={20} textAnchor="middle" className={styles.tag}>
            ETP
          </text>
          <text x={0} y={78} textAnchor="middle" className={styles.dist}>
            {Math.round(etpNm)}
          </text>
        </g>

        {/* PNR */}
        {hasPnr && (
          <g
            className={`${styles.marker} ${styles.pnr}`}
            style={{ '--x': `${xFor(pnrNm, totalNm)}px` } as CSSProperties}
          >
            <line x1={0} y1={38} x2={0} y2={66} className={styles.pnrTick} />
            <text x={0} y={20} textAnchor="middle" className={styles.tag}>
              PNR
            </text>
            <text x={0} y={78} textAnchor="middle" className={styles.dist}>
              {Math.round(pnrNm)}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}
