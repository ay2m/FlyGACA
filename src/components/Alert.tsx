import type { ReactNode } from 'react';
import styles from './Alert.module.css';

type AlertTone = 'error' | 'success' | 'warning';

interface AlertAction {
  /** Already-translated button label. */
  label: ReactNode;
  onClick: () => void;
}

interface AlertProps {
  /** Tonal treatment — sets the border + tinted background from the colour tokens. */
  tone?: AlertTone;
  /** The already-translated message (i18n stays at the call site). */
  children: ReactNode;
  /** Optional inline action, e.g. a retry or dismiss. */
  action?: AlertAction;
  /** Optional decorative leading glyph (rendered aria-hidden). */
  icon?: ReactNode;
  /** ARIA role — 'alert' for errors (the default), 'status' for non-urgent notices. */
  role?: 'alert' | 'status';
  /** Extra class for the wrapper. */
  className?: string;
}

const TONE_CLASS: Record<AlertTone, string> = {
  error: styles.error,
  success: styles.success,
  warning: styles.warning,
};

/**
 * A composed inline alert / notice band — tonal background + accent border, a
 * message, and an optional inline action — replacing the ad-hoc error rows
 * across the hubs. Presentational only: callers pass already-translated
 * `ReactNode`s, so the component holds no strings.
 */
export function Alert({
  tone = 'error',
  children,
  action,
  icon,
  role = 'alert',
  className,
}: AlertProps) {
  const cls = [styles.root, TONE_CLASS[tone], className].filter(Boolean).join(' ');
  return (
    <div className={cls} role={role}>
      {icon != null && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.message}>{children}</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
