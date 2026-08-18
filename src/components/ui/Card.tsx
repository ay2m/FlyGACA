import type { CSSProperties, HTMLAttributes } from 'react';
import styles from './Card.module.css';

/**
 * The canonical card surface on the elevated token scale (hairline + --elev-*
 * + top sheen). Pages that hand-roll a `.card` migrate to this recipe over
 * time; `accent` feeds the same `--cat-color` custom property the category
 * bars already use, so the accent mirrors in RTL via logical properties.
 */
export type CardVariant = 'default' | 'raised' | 'interactive' | 'accent';

interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** CSS color or token expression, e.g. `var(--gold)` — sets `--cat-color`. */
  accent?: string;
  as?: 'div' | 'article' | 'section' | 'aside' | 'li';
}

export function Card({
  variant = 'default',
  accent,
  as: Tag = 'div',
  className,
  style,
  ...rest
}: CardProps) {
  const classes = [styles.card, variant !== 'default' && styles[variant], className]
    .filter(Boolean)
    .join(' ');
  const merged = accent ? ({ ...style, '--cat-color': accent } as CSSProperties) : style;
  return <Tag className={classes} style={merged} {...rest} />;
}
