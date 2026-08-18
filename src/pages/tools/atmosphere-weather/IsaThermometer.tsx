import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './IsaThermometer.module.css';

interface IsaThermometerProps {
  oat: number;
  isaTemp: number;
  dev: number;
}

const TMIN = -40;
const TMAX = 40;
const TOP = 16;
const BOTTOM = 176;

const frac = (c: number) => Math.min(1, Math.max(0, (c - TMIN) / (TMAX - TMIN)));
const yFor = (c: number) => BOTTOM - frac(c) * (BOTTOM - TOP);

/**
 * A thermometer for the ISA tool: the mercury rises to the OAT, a dashed line
 * marks the ISA standard temperature at that altitude, and the gap between
 * them is the deviation — warm above ISA, cold below. The column glides as the
 * OAT changes. Decorative (the ResultStats carry the numbers); warm/cold reads
 * by the OAT sitting above/below the ISA line, not hue alone.
 */
export function IsaThermometer({ oat, isaTemp, dev }: IsaThermometerProps) {
  const { t } = useTranslation();
  const warm = dev >= 0;
  const isaY = yFor(isaTemp);
  const oatY = yFor(oat);
  return (
    <figure className={styles.wrap}>
      <svg
        viewBox="0 0 170 200"
        role="img"
        aria-label={t('isaTool.thermoLabel', {
          oat: Math.round(oat),
          isa: Math.round(isaTemp),
        })}
        className={styles.svg}
      >
        <rect x={64} y={14} width={14} height={164} rx={7} className={styles.tube} />
        <circle cx={71} cy={183} r={13} className={styles.tube} />
        <g
          className={`${styles.mercury} ${warm ? styles.warm : styles.cold}`}
          style={{ '--fill': frac(oat) } as CSSProperties}
        >
          <rect x={67} y={16} width={8} height={160} className={styles.col} />
          <circle cx={71} cy={183} r={10} className={styles.bulb} />
        </g>
        {/* ISA standard reference */}
        <line x1={54} y1={isaY} x2={88} y2={isaY} className={styles.isaLine} />
        <text x={92} y={isaY + 4} className={styles.isaTick}>
          ISA {Math.round(isaTemp)}°
        </text>
        <text x={92} y={oatY + 4} className={styles.oatTick}>
          OAT {Math.round(oat)}°
        </text>
      </svg>
      <figcaption className={styles.caption}>
        Δ {dev >= 0 ? '+' : ''}
        {Math.round(dev)} °C
      </figcaption>
    </figure>
  );
}
