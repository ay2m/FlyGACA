import type { Transition } from 'framer-motion';

/**
 * Standard motion configuration across FlyGACA application surfaces.
 * Aligns framer-motion settings with WCAG 2.1 prefers-reduced-motion criteria.
 */

export const TRANSITION_DEFAULTS = {
  durationFast: 0.15,
  durationBase: 0.25,
  durationSlow: 0.45,
  easeOutCubic: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeInOutCubic: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export const SPRING_PROFILES = {
  instant: { type: 'spring', stiffness: 500, damping: 35 } as Transition,
  interactive: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  smooth: { type: 'spring', stiffness: 260, damping: 26 } as Transition,
  gentle: { type: 'spring', stiffness: 180, damping: 24 } as Transition,
  bouncy: { type: 'spring', stiffness: 320, damping: 18 } as Transition,
  stiff: { type: 'spring', stiffness: 600, damping: 40 } as Transition,
  settle: { type: 'spring', stiffness: 120, damping: 20 } as Transition,
};

export function getReducedMotionTransition(fallbackDuration = 0): Transition {
  return {
    duration: fallbackDuration,
    ease: 'linear',
  };
}

export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
