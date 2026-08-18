import { fmtInt } from '@/components/calc/format';
import styles from './AltimeterDial.module.css';

interface AltimeterDialProps {
  pressureAltitude: number;
}

const CX = 60;
const CY = 60;
/** Point on the face at `deg` clockwise from 12 o'clock, `r` from centre. */
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
};

/**
 * A three-pointer-style altimeter reduced to its readable essence: the
 * hundreds hand sweeps once per 1,000 ft, the Kollsman window reads the
 * standard 1013 (the setting at which an altimeter reads pressure altitude),
 * and the full value sits in a digital readout. Decorative company for the
 * ResultStat — hidden from AT; the needle snaps under reduced motion.
 */
export function AltimeterDial({ pressureAltitude }: AltimeterDialProps) {
  const paMod = ((pressureAltitude % 1000) + 1000) % 1000;
  const angle = (paMod / 1000) * 360;
  return (
    <div className={styles.wrap} aria-hidden="true">
      <svg viewBox="0 0 120 132" className={styles.svg}>
        <circle cx={CX} cy={CY} r={54} className={styles.face} />
        {Array.from({ length: 10 }, (_, i) => {
          const outer = polar(i * 36, 52);
          const inner = polar(i * 36, i === 0 ? 42 : 46);
          const num = polar(i * 36, 34);
          return (
            <g key={i}>
              <line
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                className={styles.tick}
                strokeWidth={i === 0 ? 2 : 1}
              />
              <text x={num.x} y={num.y + 3} textAnchor="middle" className={styles.num}>
                {i}
              </text>
            </g>
          );
        })}
        {/* Kollsman window — the barometric setting */}
        <rect x={84} y={53} width={22} height={14} rx={2} className={styles.kollsman} />
        <text x={95} y={63} textAnchor="middle" className={styles.setting}>
          1013
        </text>
        {/* hundreds hand */}
        <g className={styles.needle} style={{ transform: `rotate(${angle.toFixed(2)}deg)` }}>
          <path d="M60 60 L57 58 L60 20 L63 58 Z" className={styles.hand} />
        </g>
        <circle cx={CX} cy={CY} r={4} className={styles.hub} />
        <text x={CX} y={126} textAnchor="middle" className={styles.digital}>
          {fmtInt(pressureAltitude)} ft
        </text>
      </svg>
    </div>
  );
}
