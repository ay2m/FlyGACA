import type { ReactNode } from 'react';
import styles from './Stepper.module.css';

export interface StepperStep {
  /** Step heading (already translated). */
  title: ReactNode;
  /** Step body copy (already translated). */
  body: ReactNode;
}

interface StepperProps {
  /** Ordered steps; the node numbers (1, 2, 3 …) are derived from order. */
  steps: StepperStep[];
  /** Optional extra class on the `<ol>` (e.g. a page's top-margin override). */
  className?: string;
}

/**
 * Connected numbered stepper — the "How it works" rail shared by Home, About and
 * Schools. The numbered nodes ride a brand-gradient rail (horizontal on desktop,
 * vertical when stacked) so an ordered flow reads as one track rather than three
 * interchangeable cards. A guarded scroll-reveal cascades the nodes in where the
 * browser supports it and the reader hasn't asked for reduced motion; everywhere
 * else the finished stepper simply shows, with no layout shift.
 *
 * Presentational only — callers translate `title`/`body` at the call site, so
 * i18n parity is untouched.
 */
export function Stepper({ steps, className }: StepperProps) {
  return (
    <ol className={className ? `${styles.steps} ${className}` : styles.steps}>
      {steps.map((s, i) => (
        <li key={i} className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            {i + 1}
          </span>
          <h3 className={styles.stepTitle}>{s.title}</h3>
          <p className={styles.stepBody}>{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
