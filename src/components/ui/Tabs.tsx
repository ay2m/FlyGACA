import type { ComponentPropsWithoutRef } from 'react';
import styles from './Tabs.module.css';

/**
 * Segmented tab strip — the one shared implementation of the tablist well
 * that Library, Learn and Records each used to hand-roll. Visuals follow the
 * elevated vocabulary (sunken well + hairline; the active segment raises).
 * Purely presentational: selection state stays in the consumer.
 */
export function Tabs({
  label,
  className,
  children,
  ...rest
}: { label: string } & ComponentPropsWithoutRef<'div'>) {
  const classes = className ? `${styles.tabs} ${className}` : styles.tabs;
  return (
    <div role="tablist" aria-label={label} className={classes} {...rest}>
      {children}
    </div>
  );
}

interface TabProps extends ComponentPropsWithoutRef<'button'> {
  active?: boolean;
}

export function Tab({ active = false, className, ...rest }: TabProps) {
  const classes = [styles.tab, active && styles.active, className].filter(Boolean).join(' ');
  return <button type="button" role="tab" aria-selected={active} className={classes} {...rest} />;
}
