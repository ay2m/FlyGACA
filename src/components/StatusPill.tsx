import type { ReactNode, HTMLAttributes } from 'react';
import styles from './StatusPill.module.css';

export type StatusTone = 'live' | 'data' | 'success' | 'warning' | 'danger';

const toneClass: Record<StatusTone, string> = {
  live: styles.toneLive,
  data: styles.toneData,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
};

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic colour: green = live/online, cyan = data, plus success/warning/danger. */
  tone: StatusTone;
  /** Pulsing dot — for live/online surfaces; short-circuits under reduced motion. */
  pulse?: boolean;
  /** Trailing citation slot (e.g. a cited rule §number), divided off from the label. */
  cite?: ReactNode;
  /** Kept as a styling/test hook (e.g. the chat grounding verdict). */
  'data-state'?: string;
  children: ReactNode;
}

/**
 * One status-pill vocabulary across the app — a tinted pill + state dot, derived
 * from the chat grounding badge. `tone` drives the semantic colour; `pulse`
 * animates the dot for live surfaces. Any extra attributes (e.g. `role="status"`,
 * `data-state`) pass through to the wrapper.
 */
export function StatusPill({
  tone,
  pulse = false,
  cite,
  children,
  className,
  ...rest
}: StatusPillProps) {
  return (
    <span className={`${styles.pill} ${toneClass[tone]} ${className ?? ''}`} {...rest}>
      <span className={`${styles.dot} ${pulse ? styles.dotPulse : ''}`} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
      {cite != null && <span className={styles.cls}>{cite}</span>}
    </span>
  );
}
