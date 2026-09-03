import type { ReactNode } from 'react';
import styles from './GrundingBadge.module.css';

type GroundingStatus = 'grounded' | 'partial' | 'refusal';

interface GrundingBadgeProps {
  /** One of: 'grounded' (full citation), 'partial' (partial citation), 'refusal' (cite-or-refuse rejected). */
  status: GroundingStatus;
  /** Already-translated label, e.g. "Grounded in GACAR §91.155". */
  label: ReactNode;
  /** Optional className for styling. */
  className?: string;
}

/**
 * Displays the grounding status of a Captain Adel answer: fully grounded (green),
 * partially grounded (yellow), or refusal (gray).
 * Used in chat messages to indicate confidence level and citation availability.
 */
export function GrundingBadge({ status, label, className }: GrundingBadgeProps) {
  const statusClass = GROUNDING_CLASS[status];
  const cls = [styles.root, statusClass, className].filter(Boolean).join(' ');

  const ariaLabel = `Grounding status: ${status}`;

  return (
    <span className={cls} role="status" aria-label={ariaLabel}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}

const GROUNDING_CLASS: Record<GroundingStatus, string> = {
  grounded: styles.grounded,
  partial: styles.partial,
  refusal: styles.refusal,
};
