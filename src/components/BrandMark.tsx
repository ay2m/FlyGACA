import styles from './BrandMark.module.css';

interface BrandMarkProps {
  /** Layout passthrough (margins/positioning); the medallion's size is fixed. */
  className?: string;
}

/**
 * The Fly GACA falcon on a circular brand-ringed medallion — the product mark
 * presented as a focal identity element. Used where a pilot-facing surface wants
 * the brand rather than Captain Adel's portrait (the dashboard hero, the sign-in
 * aside). Decorative: hidden from assistive tech, since adjacent copy labels the
 * surface.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={`${styles.brandMark} ${className ?? ''}`} aria-hidden="true">
      <img src="/img/flygaca-mark.png" alt="" width={42} height={42} decoding="async" />
    </span>
  );
}
