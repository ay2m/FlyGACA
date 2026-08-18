import styles from './BarSparkline.module.css';

export interface SparkBar {
  label: string;
  value: number;
}

interface BarSparklineProps {
  bars: SparkBar[];
  /** Accessible summary of the whole series. */
  title: string;
}

/**
 * A tiny inline-SVG bar chart for dashboard trends — no charting dependency.
 * Bars read left→right in chronological order (forced LTR so the time axis
 * doesn't mirror under RTL); colours and radii come from tokens. The series is
 * exposed to assistive tech via role="img" + <title>.
 */
export function BarSparkline({ bars, title }: BarSparklineProps) {
  const W = 240;
  const H = 64;
  const gap = 6;
  const n = Math.max(bars.length, 1);
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <figure className={styles.wrap} dir="ltr">
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={title}
        preserveAspectRatio="none"
      >
        <title>{title}</title>
        {bars.map((b, i) => {
          const h = b.value > 0 ? Math.max(2, (b.value / max) * (H - 14)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={b.label}>
              <rect className={styles.bar} x={x} y={H - 12 - h} width={bw} height={h} rx={3} />
              <text className={styles.tick} x={x + bw / 2} y={H - 1} textAnchor="middle">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
