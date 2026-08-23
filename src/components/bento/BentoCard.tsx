import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Link } from 'react-router';
import { useHoverCapable } from '@/hooks/useHoverCapable';
import { BENTO_DUR_ENTRY_S, BENTO_EASE_ENTRY, BENTO_LIFT_HOVER } from './motion';
import { useCardGlow } from './useCardGlow';
import styles from './BentoCard.module.css';

const MotionLink = motion.create(Link);

export type BentoSpan = 'sm' | 'md' | 'lg' | 'tall' | 'wide' | 'full';
export type BentoTone = 'default' | 'cyan' | 'green';

interface BentoCardProps {
  /** Grid footprint. Maps to a span class; collapses responsively. */
  span?: BentoSpan;
  /** Which neon glow tints the cursor-follow border illumination. */
  tone?: BentoTone;
  /** When set, the whole card is a router Link to this route. */
  to?: string;
  /** Fallback accessible name for the link branch — ignored when `labelledBy`
   *  is set. Prefer `labelledBy`: an aria-label replaces the link's computed
   *  name, hiding the tile's heading and stats from assistive tech. */
  label?: string;
  /** id of the tile's heading; names the link via aria-labelledby. */
  labelledBy?: string;
  /** Extra class merged onto the card root. */
  className?: string;
  children: ReactNode;
}

const spanClass: Record<BentoSpan, string> = {
  sm: styles.spanSm,
  md: styles.spanMd,
  lg: styles.spanLg,
  tall: styles.spanTall,
  wide: styles.spanWide,
  full: styles.spanFull,
};

const toneClass: Record<BentoTone, string> = {
  default: styles.toneDefault,
  cyan: styles.toneCyan,
  green: styles.toneGreen,
};

/**
 * A single bento tile. Inherits the parent grid's `hidden`→`show` variant so it
 * settles in on the staggered kinetic entry, lifts subtly on hover, and renders
 * a cursor-following perimeter glow. All transform/opacity-only so it composites
 * on the GPU; `useReducedMotion` turns entry and hover into no-ops so the tile
 * renders settled on first paint (belt-and-braces with the global
 * prefers-reduced-motion reset), and hover effects only attach when the pointer
 * can actually hover so taps never strand them.
 */
export function BentoCard({
  span = 'md',
  tone = 'default',
  to,
  label,
  labelledBy,
  className: extraClassName,
  children,
}: BentoCardProps) {
  const reduce = useReducedMotion();
  const hoverCapable = useHoverCapable();
  const glow = useCardGlow<HTMLDivElement & HTMLAnchorElement>();

  const itemVariants: Variants = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, scale: 0.94, y: 24 },
        show: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: BENTO_DUR_ENTRY_S, ease: BENTO_EASE_ENTRY },
        },
      };

  const hover = reduce || !hoverCapable ? undefined : { scale: BENTO_LIFT_HOVER };

  const className = [styles.card, spanClass[span], toneClass[tone], extraClassName]
    .filter(Boolean)
    .join(' ');

  const inner = <span className={styles.glow} aria-hidden="true" />;

  if (to) {
    return (
      <MotionLink
        // eslint-disable-next-line react-hooks/refs
        ref={glow.ref}
        to={to}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        className={`${className} ${styles.link}`}
        variants={itemVariants}
        whileHover={hover}
        whileTap={reduce ? undefined : { scale: 0.995 }}
        // eslint-disable-next-line react-hooks/refs
        onPointerMove={glow.onPointerMove}
        // eslint-disable-next-line react-hooks/refs
        onPointerLeave={glow.onPointerLeave}
      >
        {inner}
        <span className={styles.body}>{children}</span>
      </MotionLink>
    );
  }

  return (
    <motion.div
      // eslint-disable-next-line react-hooks/refs
      ref={glow.ref}
      className={className}
      variants={itemVariants}
      whileHover={hover}
      // eslint-disable-next-line react-hooks/refs
      onPointerMove={glow.onPointerMove}
      // eslint-disable-next-line react-hooks/refs
      onPointerLeave={glow.onPointerLeave}
    >
      {inner}
      <div className={styles.body}>{children}</div>
    </motion.div>
  );
}
