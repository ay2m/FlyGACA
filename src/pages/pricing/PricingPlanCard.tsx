import { Link } from 'react-router';
import type { ReactNode } from 'react';
import styles from './Pricing.module.css';

export interface PricingPlanCardProps {
  name: string;
  price: string;
  /** Optional struck-through former price shown above `price` (e.g. a launch discount). */
  priceStrike?: string;
  priceNote?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
  ctaDisabled?: boolean;
  ctaHref?: string;
  ctaOnClick?: () => void;
  note?: string;
  belowCta?: ReactNode;
  current?: boolean;
  currentLabel?: string;
}

/** A single pricing plan card (Free / Pro / School). Presentational. */
export function PricingPlanCard({
  name,
  price,
  priceStrike,
  priceNote,
  features,
  cta,
  highlight,
  badge,
  ctaDisabled,
  ctaHref,
  ctaOnClick,
  note,
  belowCta,
  current,
  currentLabel,
}: PricingPlanCardProps) {
  return (
    <div
      className={`${styles.plan} ${highlight ? styles.highlight : ''} ${current ? styles.currentPlan : ''}`}
    >
      {badge && !current && <span className={styles.popularBadge}>{badge}</span>}
      {current && currentLabel && <span className={styles.currentBadge}>{currentLabel}</span>}
      <h2 className={styles.planName}>{name}</h2>
      {/* Fixed-height block so every card's feature list starts at the same Y,
          whether or not the plan carries a VAT note (Free has none). */}
      <div className={styles.priceBlock}>
        {priceStrike && (
          <p className={styles.priceStrike}>
            <bdi dir="ltr">{priceStrike}</bdi>
          </p>
        )}
        <p className={styles.price}>
          <bdi dir="ltr">{price}</bdi>
        </p>
        {priceNote && <p className={styles.priceNote}>{priceNote}</p>}
      </div>
      <ul className={styles.features}>
        {features.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {ctaHref ? (
        <Link className={styles.cta} to={ctaHref}>
          {cta}
        </Link>
      ) : (
        <button type="button" className={styles.cta} disabled={ctaDisabled} onClick={ctaOnClick}>
          {cta}
        </button>
      )}
      {belowCta}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
