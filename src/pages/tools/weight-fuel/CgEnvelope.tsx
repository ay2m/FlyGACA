import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { fin } from '@/calc/guards';
import type { EnvelopeStatus } from '@/calc/weightBalance';
import styles from './CgEnvelope.module.css';

interface CgEnvelopeProps {
  weight: number;
  cg: number;
  cgFwd: number;
  cgAft: number;
  mtow: number;
  status: EnvelopeStatus;
}

const VW = 240;
const VH = 200;
const M = { l: 12, r: 12, t: 14, b: 22 };
const PLOT = { x: M.l, y: M.t, w: VW - M.l - M.r, h: VH - M.t - M.b };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A centre-of-gravity envelope plot: max-weight × forward/aft CG limits drawn
 * as the safe box, with the loaded point riding inside (or outside) it. The
 * point glides to its new spot as the load changes; the envelope box is fixed
 * so that motion reads as "where am I in the envelope". Decorative — the
 * in/out verdict is a ResultStat on the page; a caption carries the summary.
 * Falls back to a bare point + axis when no CG limits are entered.
 */
export function CgEnvelope({ weight, cg, cgFwd, cgAft, mtow, status }: CgEnvelopeProps) {
  const { t } = useTranslation();
  const hasBox = fin(cgFwd) && fin(cgAft) && cgAft > cgFwd;

  // X domain (CG arm): stable around the envelope so the point moves, not the
  // box; without limits, span a small window around the loaded CG.
  const [xLo, xHi] = hasBox
    ? [cgFwd - (cgAft - cgFwd) * 0.3, cgAft + (cgAft - cgFwd) * 0.3]
    : [cg - Math.max(3, Math.abs(cg) * 0.08), cg + Math.max(3, Math.abs(cg) * 0.08)];
  const yHi = (fin(mtow) ? Math.max(mtow, weight) : weight) * 1.08 || 1;

  const px = (v: number) => PLOT.x + ((v - xLo) / (xHi - xLo || 1)) * PLOT.w;
  const py = (v: number) => PLOT.y + PLOT.h - (v / yHi) * PLOT.h;

  const boxTop = fin(mtow) ? py(mtow) : PLOT.y;
  const markX = clamp(px(cg), PLOT.x, PLOT.x + PLOT.w);
  const markY = clamp(py(weight), PLOT.y, PLOT.y + PLOT.h);

  const label = t('weightBalance.envelopeSummary', {
    weight: Math.round(weight),
    cg: cg.toFixed(1),
    status: t(`weightBalance.envelope.${status}`),
  });

  const markClass =
    status === 'out'
      ? `${styles.mark} ${styles.markOut}`
      : status === 'in'
        ? `${styles.mark} ${styles.markIn}`
        : styles.mark;

  return (
    <figure className={styles.wrap}>
      <svg viewBox={`0 0 ${VW} ${VH}`} className={styles.svg} role="img" aria-label={label}>
        {/* plot frame */}
        <line
          x1={PLOT.x}
          y1={PLOT.y + PLOT.h}
          x2={PLOT.x + PLOT.w}
          y2={PLOT.y + PLOT.h}
          className={styles.axis}
        />
        <line x1={PLOT.x} y1={PLOT.y} x2={PLOT.x} y2={PLOT.y + PLOT.h} className={styles.axis} />

        {hasBox && (
          <rect
            x={px(cgFwd)}
            y={boxTop}
            width={px(cgAft) - px(cgFwd)}
            height={PLOT.y + PLOT.h - boxTop}
            className={styles.box}
            rx="2"
          />
        )}
        {fin(mtow) && (
          <line x1={PLOT.x} y1={boxTop} x2={PLOT.x + PLOT.w} y2={boxTop} className={styles.limit} />
        )}

        {/* loaded point — glides to its mapped position */}
        <g
          className={markClass}
          style={{ '--px': `${markX}px`, '--py': `${markY}px` } as CSSProperties}
        >
          <circle r="5" className={styles.dot} />
          {status === 'out' && <circle r="8.5" className={styles.ring} />}
        </g>
      </svg>
      <figcaption className={styles.caption}>
        <span className={styles.axisLabel}>{t('weightBalance.envelopeCgAxis')}</span>
        {hasBox && (
          <span className={styles.legend}>
            <bdi dir="ltr">
              {Math.round(cgFwd)}–{Math.round(cgAft)}
            </bdi>{' '}
            {t('weightBalance.cg')}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
