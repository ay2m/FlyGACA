import type { ReactNode } from 'react';
import styles from './Pricing.module.css';

/**
 * A one-time-purchase band (Exam Season Pass · Exam Prep packs · All-Access
 * Bundle): heading + lead on one side, price + CTA on the other. Presentational
 * — the caller supplies the already-localized strings and the CTA node (a
 * checkout button, a "coming soon" disabled button, or a Link).
 */
export function PriceBand({
  id,
  head,
  lead,
  price,
  action,
}: {
  /** Heading id, wired to the section's aria-labelledby. */
  id: string;
  head: string;
  lead: string;
  price: string;
  action: ReactNode;
}) {
  return (
    <section className={styles.passBand} aria-labelledby={id}>
      <div>
        <h2 id={id} className={styles.passHead}>
          {head}
        </h2>
        <p className={styles.passLead}>{lead}</p>
      </div>
      <div className={styles.passAside}>
        <span className={styles.passPrice}>
          <bdi dir="ltr">{price}</bdi>
        </span>
        {action}
      </div>
    </section>
  );
}
