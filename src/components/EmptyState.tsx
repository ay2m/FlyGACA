import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateAction {
  /** Already-translated button label. */
  label: ReactNode;
  onClick: () => void;
}

interface EmptyStateProps {
  /** Decorative leading glyph (rendered aria-hidden). */
  icon?: ReactNode;
  /** The already-translated message (i18n stays at the call site). */
  children: ReactNode;
  /** Optional one-tap recovery, e.g. clear the search/filter. */
  action?: EmptyStateAction;
  /** Tighter treatment for narrow contexts (sidebars). */
  compact?: boolean;
  /** ARIA live role — a no-results region is a status by default. */
  role?: 'status' | 'alert';
  /** Extra class for the wrapper. */
  className?: string;
}

/**
 * A composed empty / no-results state — a decorative glyph, a message, and an
 * optional one-tap recovery — replacing bare `<p>` empties across the hubs.
 * Presentational only: callers pass already-translated `ReactNode`s, so the
 * component holds no strings and EN/AR parity is handled at the call site.
 */
export function EmptyState({
  icon,
  children,
  action,
  compact = false,
  role = 'status',
  className,
}: EmptyStateProps) {
  const cls = [styles.root, compact ? styles.compact : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role={role}>
      {icon != null && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={styles.message}>{children}</p>
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
