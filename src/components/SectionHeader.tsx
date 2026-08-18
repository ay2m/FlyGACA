import type { CSSProperties, ReactNode } from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  /** The group / section title. */
  title: ReactNode;
  /** Optional trailing count or meta (e.g. "18 documents"). */
  count?: ReactNode;
  /** Accent colour for the glowing bar — any CSS colour or token. Defaults to brand. */
  tone?: string;
  /** Heading level for semantics (default h2). */
  as?: 'h2' | 'h3';
  /** Optional id so the heading can label a region. */
  id?: string;
}

/**
 * Section header with a glowing accent bar — the Fly GACA Design System pattern
 * for grouping cards by category (reference §10). Tone-driven via CSS variable so
 * it inherits the per-category accent map.
 */
export function SectionHeader({ title, count, tone, as: Tag = 'h2', id }: SectionHeaderProps) {
  const style = tone ? ({ '--tone': tone } as CSSProperties) : undefined;
  return (
    <div className={styles.head} style={style}>
      <span className={styles.bar} aria-hidden="true" />
      <Tag className={styles.title} id={id}>
        {title}
      </Tag>
      {count != null && <span className={styles.count}>{count}</span>}
    </div>
  );
}
