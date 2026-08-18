import type { ReactNode } from 'react';
import styles from './calc.module.css';

/** Responsive grid of NumberFields. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className={styles.fieldGrid}>{children}</div>;
}

/** Responsive <dl> grid of ResultStats. `aria-live` (kept on the <dl> so its list
 *  semantics survive) announces recomputed results to screen readers as inputs
 *  change — without it a tool's answers update silently (WCAG 4.1.3). */
export function OutputGrid({ children }: { children: ReactNode }) {
  return (
    <dl className={styles.outputGrid} aria-live="polite">
      {children}
    </dl>
  );
}
