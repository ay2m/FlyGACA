import type { CSSProperties } from 'react';
import styles from './Waveform.module.css';

interface WaveformProps {
  /** Number of bars (default 4). */
  bars?: number;
}

/**
 * A tiny equalizer — a row of bars rising and falling on a staggered loop — as
 * an "audio is live" cue for the voice controls (listening or speaking). It
 * inherits `currentColor`, so it takes on the button's active accent.
 * Decorative (the button's label and aria-pressed carry the state), so it's
 * hidden from AT; under reduced-motion the bars hold at a steady mid-height.
 */
export function Waveform({ bars = 4 }: WaveformProps) {
  return (
    <span className={styles.wave} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={styles.bar} style={{ '--i': i } as CSSProperties} />
      ))}
    </span>
  );
}
