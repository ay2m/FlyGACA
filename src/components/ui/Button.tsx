import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

/**
 * Typed wrappers over the global `.btn*` classes (styled in global.css, which
 * stays the single source of truth). Two named exports instead of a
 * polymorphic `as` prop: `Button` renders a <button>, `ButtonLink` a router
 * <Link>. Adoption is incremental — the raw classes keep working everywhere.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'clay' | 'clayPrimary';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  gold: 'btn btn-gold',
  ghost: 'btn btn-ghost',
  clay: 'btn btn-clay',
  clayPrimary: 'btn btn-clay-primary',
};

interface BaseProps {
  variant?: ButtonVariant;
  /** Leading glyph — sized and gapped by the `.btn` flex layout. */
  icon?: ReactNode;
  className?: string;
}

function btnClass(variant: ButtonVariant, className?: string): string {
  return className ? `${VARIANT_CLASS[variant]} ${className}` : VARIANT_CLASS[variant];
}

export function Button({
  variant = 'primary',
  icon,
  className,
  children,
  ...rest
}: BaseProps & ComponentPropsWithoutRef<'button'>) {
  return (
    <button className={btnClass(variant, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  icon,
  className,
  children,
  ...rest
}: BaseProps & LinkProps) {
  return (
    <Link className={btnClass(variant, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
