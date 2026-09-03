import type { Variants } from 'framer-motion';

/**
 * Page transitions and modal backdrop animation variants.
 * Respects hardware-accelerated transforms for seamless route transitions.
 */

export const pageFadeVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.18,
      ease: [0.7, 0, 0.84, 0],
    },
  },
};

export const bentoCardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

export const spotlightVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: -12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -8,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};
