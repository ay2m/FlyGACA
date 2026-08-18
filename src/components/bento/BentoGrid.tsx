import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { BENTO_DELAY_CHILDREN_S, BENTO_STAGGER_S } from './motion';
import styles from './BentoGrid.module.css';

interface BentoGridProps {
  children: ReactNode;
  /** Accessible label for the grid region (e.g. "Fly GACA dashboard"). */
  label?: string;
}

/**
 * The bento layout shell. As a framer-motion container it orchestrates the
 * staggered kinetic entry: each child `BentoCard` inherits the `hidden`→`show`
 * variant and settles in `--dur-stagger` after the previous one. Reduced-motion
 * makes both variant states no-ops so the grid renders settled on first paint —
 * no fade to race an axe scan or flash on a slow device.
 */
export function BentoGrid({ children, label }: BentoGridProps) {
  const reduce = useReducedMotion();

  const container: Variants = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: {},
        show: {
          transition: {
            staggerChildren: BENTO_STAGGER_S,
            delayChildren: BENTO_DELAY_CHILDREN_S,
          },
        },
      };

  return (
    <motion.section
      className={styles.grid}
      aria-label={label}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.section>
  );
}
