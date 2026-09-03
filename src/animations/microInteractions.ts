import type { Variants, TargetAndTransition } from 'framer-motion';

/**
 * Micro-interaction motion variants and spring profiles for FlyGACA UI.
 * Standardized across interactive controls to ensure hardware-accelerated 60fps animations.
 */

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
  mass: 1,
};

export const SPRING_BOUNCY = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 18,
  mass: 0.9,
};

/**
 * Button press and hover micro-interaction variants.
 */
export const buttonPressVariants: Variants = {
  idle: {
    scale: 1,
    y: 0,
    transition: SPRING_SNAPPY,
  },
  hover: {
    scale: 1.02,
    y: -1,
    transition: SPRING_SNAPPY,
  },
  pressed: {
    scale: 0.96,
    y: 1,
    transition: {
      type: 'spring',
      stiffness: 600,
      damping: 35,
    },
  },
};

/**
 * Interactive quiz option selection variants.
 */
export const quizOptionVariants: Variants = {
  idle: {
    scale: 1,
    x: 0,
    boxShadow: '0 0 0 0 rgba(45, 110, 138, 0)',
    transition: SPRING_SNAPPY,
  },
  hover: {
    scale: 1.01,
    x: 4,
    boxShadow: '0 4px 12px rgba(45, 110, 138, 0.15)',
    transition: SPRING_SNAPPY,
  },
  selected: {
    scale: 1.02,
    x: 8,
    boxShadow: '0 0 0 2px rgba(74, 156, 184, 0.8)',
    transition: SPRING_BOUNCY,
  },
  correct: {
    scale: 1.02,
    borderColor: '#8fc9a8',
    backgroundColor: 'rgba(143, 201, 168, 0.12)',
    transition: SPRING_SNAPPY,
  },
  incorrect: {
    x: [-4, 4, -4, 4, 0],
    borderColor: '#cf6b52',
    backgroundColor: 'rgba(207, 107, 82, 0.12)',
    transition: { duration: 0.4 },
  },
};

/**
 * Staggered container variants for list rendering.
 */
export const listContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

/**
 * Staggered item entry and reordering variants.
 */
export const listReorderVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      ...SPRING_GENTLE,
    },
  }),
};

/**
 * Calculates cursor parallax offset styles for interactive card/hero components.
 */
export function getCursorTrackingStyle(
  offsetX: number,
  offsetY: number,
  intensity: number = 0.05,
): TargetAndTransition {
  return {
    x: offsetX * intensity,
    y: offsetY * intensity,
    transition: SPRING_GENTLE,
  };
}

