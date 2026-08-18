import type { CSSProperties } from 'react';
import styles from './AchievementStamp.module.css';

interface AchievementStampProps {
  label: string;
  earned: boolean;
  have: number;
  target: number;
  /** Stagger slot for the one-shot entrance cascade. */
  index?: number;
}

/**
 * A passport-style achievement stamp: earned reads as an inked solid ring
 * with a star, unearned as a dashed outline with its have/target progress —
 * state is carried by shape, not hue alone. The entrance staggers once on
 * mount; no per-visit celebration state is stored anywhere.
 */
export function AchievementStamp({
  label,
  earned,
  have,
  target,
  index = 0,
}: AchievementStampProps) {
  return (
    <span
      className={earned ? `${styles.stamp} ${styles.earned}` : styles.stamp}
      style={{ '--stamp-i': index } as CSSProperties}
      title={earned ? undefined : `${have} / ${target}`}
    >
      <span className={styles.mark} aria-hidden="true">
        {earned ? '★' : '○'}
      </span>
      <span>{label}</span>
      {!earned && (
        <span className={styles.prog}>
          {have}/{target}
        </span>
      )}
    </span>
  );
}
