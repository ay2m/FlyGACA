import styles from './AttitudeIndicator.module.css';

interface AttitudeIndicatorProps {
  pitchDeg: number;
  bankDeg: number;
}

/**
 * A miniature artificial horizon. The sky/ground card rotates with bank and
 * slides along its own (rotated) vertical axis with pitch, exactly like a real
 * ADI; the wings stay fixed. Targets update at 1 Hz and a linear CSS transition
 * carries the motion between updates (dropped under reduced motion). Decorative
 * to AT — the flight card renders the same figures as text.
 */
export function AttitudeIndicator({ pitchDeg, bankDeg }: AttitudeIndicatorProps) {
  const transform = `rotate(${(-bankDeg).toFixed(2)}deg) translateY(${(pitchDeg * 2.2).toFixed(2)}px)`;
  return (
    <div className={styles.adi} aria-hidden="true">
      <div className={styles.horizon} style={{ transform }} />
      <div className={styles.wings} />
    </div>
  );
}
