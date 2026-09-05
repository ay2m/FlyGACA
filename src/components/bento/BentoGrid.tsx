import { Suspense, type ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { BENTO_DELAY_CHILDREN_S, BENTO_STAGGER_S } from './motion';
import { bentoCardVariants } from '@/animations/pageTransitions';
import styles from './BentoGrid.module.css';

interface BentoGridProps {
  children?: ReactNode;
  items?: Array<{ id: string | number; content: ReactNode }>;
  /** Accessible label for the grid region (e.g. "Fly GACA dashboard"). */
  label?: string;
}

/**
 * The bento layout shell. As a framer-motion container it orchestrates the
 * staggered kinetic entry: each child `BentoCard` inherits the `hidden`→`show`
 * variant and settles in `--dur-stagger` after the previous one. Reduced-motion
 * makes both variant states no-ops so the grid renders settled on first paint.
 */
export function BentoGrid({ children, items, label }: BentoGridProps) {
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
    <Suspense fallback={<div className={styles.grid}>Loading dashboard...</div>}>
      <motion.section
        className={styles.grid}
        aria-label={label}
        variants={container}
        initial="hidden"
        animate="show"
      >
        {items
          ? items.map((item, i) => (
              <motion.div
                key={item.id}
                variants={bentoCardVariants}
                custom={i}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4 }}
              >
                {item.content}
              </motion.div>
            ))
          : children}
      </motion.section>
    </Suspense>
  );
}
