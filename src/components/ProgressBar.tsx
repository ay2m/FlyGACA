import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** 0–100. */
  percent: number;
  label?: string;
}

/** A token-driven progress meter (CSS width only — no motion dependency). */
export function ProgressBar({ percent, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={styles.fill} style={{ inlineSize: `${pct}%` }} />
    </div>
  );
}
