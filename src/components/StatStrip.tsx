import type { CSSProperties, ReactNode } from 'react';
import { CountUp } from './CountUp';
import styles from './StatStrip.module.css';

export interface Stat {
  /**
   * A `number` counts up from 0; a `string` counts up its leading integer and
   * renders the remainder verbatim ("74" animates, "Free" stays text); any other
   * `ReactNode` is rendered as-is (e.g. a bilingual `<bdi>EN · AR</bdi>`).
   */
  value: number | string | ReactNode;
  label: string;
}

interface StatStripProps {
  stats: Stat[];
  /** Optional uppercase kicker rendered above the tiles. */
  label?: string;
  /** Neon accent tokens cycled across the tiles. Defaults to cyan / green / gold. */
  tones?: string[];
}

const DEFAULT_TONES = ['var(--neon-cyan)', 'var(--neon-green)', 'var(--gold)'];

/** Render a stat value, animating a leading integer with CountUp where present. */
function renderValue(value: Stat['value']): ReactNode {
  if (typeof value === 'number') return <CountUp to={value} />;
  if (typeof value === 'string') {
    const m = /^(\d[\d,]*)(.*)$/.exec(value);
    if (!m) return value;
    return (
      <>
        <CountUp to={parseInt(m[1].replace(/,/g, ''), 10)} />
        {m[2]}
      </>
    );
  }
  return value;
}

/**
 * The shared credibility stat strip — instrument-style neon tiles whose figures
 * count up on first paint, each glowing in a cycled accent tone. Purely
 * presentational; consumed by the About and Schools heroes.
 */
export function StatStrip({ stats, label, tones = DEFAULT_TONES }: StatStripProps) {
  return (
    <div className={styles.strip}>
      {label && <p className={styles.label}>{label}</p>}
      <ul className={styles.stats}>
        {stats.map((s, i) => (
          <li
            key={i}
            className={styles.stat}
            style={{ '--stat-tone': tones[i % tones.length] } as CSSProperties}
          >
            <span className={styles.statValue}>{renderValue(s.value)}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
